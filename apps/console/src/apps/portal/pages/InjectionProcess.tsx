import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  MonoValue,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
  TimeDisplay,
  TimelineChart,
  type TimelineSpan,
  TraceTree,
  type TraceSpan,
} from '@lincyaw/aegis-ui';
import type {
  InjectionInjectionLogEntry,
  InjectionInjectionTimelineEvent,
  InjectionInjectionTimelineResp,
  InjectionInjectionTimelineWindow,
  TraceSpanNode,
  TraceTraceDetailResp,
} from '@lincyaw/portal';

import {
  isActiveTraceState,
  useInjectionDetail,
  useInjectionLogs,
  useInjectionTimeline,
  useProcessTrace,
  useTraceSpans,
} from '../api/injections';
import { RefreshControl } from '../components/RefreshControl';
import {
  intervalToMs,
  type RefreshInterval,
} from '../components/refresh-interval';
import { StatusChip } from '../components/StatusChip';

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) {
    return '—';
  }
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) {
    return '—';
  }
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (Number.isNaN(end) || end < start) {
    return '—';
  }
  const ms = end - start;
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = ms / 1000;
  if (s < 60) {
    return `${s.toFixed(1)}s`;
  }
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  if (m < 60) {
    return `${String(m)}m ${String(rs)}s`;
  }
  const h = Math.floor(m / 60);
  const rm = m - h * 60;
  return `${String(h)}h ${String(rm)}m`;
}

function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${String(m)}m${String(rs)}s`;
}

const PHASE_ORDER: Array<keyof InjectionInjectionTimelineResp> = [
  'pre',
  'fault',
  'post',
  'recover',
];

interface PhaseGantt {
  spans: TimelineSpan[];
  minNs: number;
  maxNs: number;
  totalMs: number;
}

function buildPhaseGantt(
  timeline: InjectionInjectionTimelineResp
): PhaseGantt | null {
  const phases: Array<{
    key: string;
    window: InjectionInjectionTimelineWindow;
  }> = [];
  for (const key of PHASE_ORDER) {
    const w = timeline[key];
    if (
      w &&
      typeof w === 'object' &&
      'start' in w &&
      (w as InjectionInjectionTimelineWindow).start
    ) {
      phases.push({
        key: String(key),
        window: w as InjectionInjectionTimelineWindow,
      });
    }
  }
  if (phases.length === 0) {
    return null;
  }
  const startsMs = phases
    .map((p) => Date.parse(p.window.start ?? ''))
    .filter((n) => !Number.isNaN(n));
  if (startsMs.length === 0) {
    return null;
  }
  const traceStartMs = Math.min(...startsMs);
  let traceEndMs = traceStartMs;
  const spans: TimelineSpan[] = phases.map((p, i) => {
    const startMs = Date.parse(p.window.start ?? '');
    const endStr = p.window.end ?? '';
    const endMs = endStr ? Date.parse(endStr) : Date.now();
    const safeStart = Number.isNaN(startMs) ? traceStartMs : startMs;
    const safeEnd = Number.isNaN(endMs)
      ? safeStart
      : Math.max(endMs, safeStart);
    if (safeEnd > traceEndMs) {
      traceEndMs = safeEnd;
    }
    return {
      id: `phase-${p.key}-${String(i)}`,
      label: p.key,
      startNs: (safeStart - traceStartMs) * 1_000_000,
      durationNs: Math.max(1, safeEnd - safeStart) * 1_000_000,
      kind: p.key,
    };
  });
  const totalMs = traceEndMs - traceStartMs;
  return {
    spans,
    minNs: 0,
    maxNs: Math.max(totalMs, 1) * 1_000_000,
    totalMs,
  };
}

function eventLines(
  events: InjectionInjectionTimelineEvent[] | undefined
): TerminalLine[] {
  if (!events || events.length === 0) {
    return [];
  }
  return [...events]
    .sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''))
    .map((e, i) => ({
      ts: e.ts ?? String(i),
      prefix: e.kind ?? 'event',
      body: e.label ?? '',
    }));
}

function logLevelClass(level: string | undefined): TerminalLine['level'] {
  const l = (level ?? '').toLowerCase();
  if (l === 'error' || l === 'fatal') {
    return 'error';
  }
  if (l === 'warn' || l === 'warning') {
    return 'warn';
  }
  if (l === 'debug' || l === 'trace') {
    return 'debug';
  }
  return 'info';
}

function logLines(
  entries: InjectionInjectionLogEntry[] | undefined
): TerminalLine[] {
  if (!entries || entries.length === 0) {
    return [];
  }
  return entries.map((e, i) => ({
    ts: e.ts ?? String(i),
    prefix: e.service ?? e.level ?? 'log',
    level: logLevelClass(e.level),
    body: e.msg ?? '',
  }));
}

function spanStatus(s: string | undefined): TraceSpan['status'] {
  const lower = (s ?? '').toLowerCase();
  if (lower === 'error' || lower === 'status_code_error') {
    return 'error';
  }
  if (lower === 'ok' || lower === 'status_code_ok') {
    return 'ok';
  }
  return 'unset';
}

interface SpanGroup {
  otelTraceId: string;
  spans: TraceSpan[];
  startMs: number;
  durationMs: number;
}

function groupSpansByOTelTrace(nodes: TraceSpanNode[] | undefined): SpanGroup[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }
  const byOTel = new Map<string, TraceSpanNode[]>();
  for (const n of nodes) {
    const key = n.otel_trace_id ?? '';
    const existing = byOTel.get(key) ?? [];
    existing.push(n);
    byOTel.set(key, existing);
  }
  const groups: SpanGroup[] = [];
  for (const [otelTraceId, members] of byOTel) {
    if (members.length === 0) {
      continue;
    }
    const localIds = new Set<string>();
    for (const m of members) {
      if (m.span_id) {
        localIds.add(m.span_id);
      }
    }
    const starts = members
      .map((m) => Date.parse(m.start_ts ?? ''))
      .filter((n) => !Number.isNaN(n));
    if (starts.length === 0) {
      continue;
    }
    const traceStartMs = Math.min(...starts);
    let traceEndMs = traceStartMs;
    const spans: TraceSpan[] = members.map((m, i) => {
      const startMs = Date.parse(m.start_ts ?? '');
      const endMs = Date.parse(m.end_ts ?? '');
      const safeStart = Number.isNaN(startMs) ? traceStartMs : startMs;
      const safeEnd = Number.isNaN(endMs)
        ? safeStart
        : Math.max(endMs, safeStart);
      if (safeEnd > traceEndMs) {
        traceEndMs = safeEnd;
      }
      const parentInTrace =
        m.parent_id && localIds.has(m.parent_id) ? m.parent_id : null;
      const name = [m.service, m.op].filter(Boolean).join(' · ') || 'span';
      return {
        id: m.span_id ?? `span-${otelTraceId}-${String(i)}`,
        parentId: parentInTrace,
        name,
        startMs: safeStart - traceStartMs,
        durationMs: safeEnd - safeStart,
        status: spanStatus(m.status),
        kind: m.service,
      };
    });
    groups.push({
      otelTraceId,
      spans,
      startMs: traceStartMs,
      durationMs: traceEndMs - traceStartMs,
    });
  }
  return groups.sort((a, b) => a.startMs - b.startMs);
}

function ProcessSummary({ trace }: { trace: TraceTraceDetailResp }) {
  const state = trace.state ?? trace.status ?? 'unknown';
  return (
    <KeyValueList
      items={[
        { k: 'state', v: <StatusChip status={state} /> },
        { k: 'type', v: trace.type ?? '—' },
        {
          k: 'project',
          v: trace.project_name ?? String(trace.project_id ?? '—'),
        },
        {
          k: 'trace id',
          v: <MonoValue size='sm'>{trace.id ?? '—'}</MonoValue>,
        },
        {
          k: 'started',
          v: <TimeDisplay value={trace.start_time ?? ''} />,
        },
        { k: 'ended', v: <TimeDisplay value={trace.end_time ?? ''} /> },
        {
          k: 'duration',
          v: formatDuration(trace.start_time, trace.end_time),
        },
      ]}
    />
  );
}

export default function InjectionProcess() {
  const { injectionId } = useParams<{ injectionId: string }>();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const validId = Number.isNaN(idNum) ? null : idNum;
  const { data: injection } = useInjectionDetail(validId);

  const traceId = injection?.trace_id ?? null;
  const [refresh, setRefresh] = useState<RefreshInterval>(5);
  const intervalMs = intervalToMs(refresh);

  const {
    data: trace,
    isLoading,
    isError,
    error,
    isFetching: traceFetching,
    refetch: refetchTrace,
  } = useProcessTrace(traceId, intervalMs);

  const {
    data: timeline,
    isFetching: timelineFetching,
    refetch: refetchTimeline,
  } = useInjectionTimeline(validId, intervalMs);

  const {
    data: logsResp,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useInjectionLogs(validId, { limit: 200 }, intervalMs);

  const {
    data: spansResp,
    isFetching: spansFetching,
    refetch: refetchSpans,
  } = useTraceSpans(traceId, intervalMs);
  const spanGroups = useMemo(
    () => groupSpansByOTelTrace(spansResp?.spans),
    [spansResp?.spans],
  );

  const phaseGantt = useMemo(
    () => (timeline ? buildPhaseGantt(timeline) : null),
    [timeline],
  );
  const events = useMemo(() => eventLines(timeline?.events), [timeline?.events]);
  const logs = useMemo(() => logLines(logsResp?.entries), [logsResp?.entries]);

  if (!injection) {
    return (
      <Panel>
        <EmptyState title='Loading injection…' />
      </Panel>
    );
  }

  if (!traceId) {
    return (
      <Panel>
        <EmptyState
          title='No process trace yet'
          description='The injection has not been dispatched to the orchestrator.'
        />
      </Panel>
    );
  }

  if (isLoading) {
    return (
      <Panel>
        <EmptyState title='Loading process trace…' />
      </Panel>
    );
  }

  if (isError || !trace) {
    return (
      <Panel>
        <EmptyState
          title='Process trace unavailable'
          description={
            error instanceof Error
              ? error.message
              : 'The orchestrator has not reported this trace.'
          }
        />
      </Panel>
    );
  }

  const live = isActiveTraceState(trace.state);
  const anyFetching =
    traceFetching || timelineFetching || logsFetching || spansFetching;

  return (
    <>
      <Panel
        title={<PanelTitle size='base'>Process trace</PanelTitle>}
        extra={
          <RefreshControl
            value={refresh}
            onChange={setRefresh}
            onRefresh={() => {
              void refetchTrace();
              void refetchTimeline();
              void refetchLogs();
              void refetchSpans();
            }}
            isFetching={anyFetching}
            isLive={live}
          />
        }
      >
        <ProcessSummary trace={trace} />
        {trace.last_event && (
          <div className='injection-process__last-event'>
            <span className='injection-process__last-event-label'>
              last event
            </span>
            <MonoValue size='sm'>{trace.last_event}</MonoValue>
          </div>
        )}
      </Panel>

      <Panel
        title={<PanelTitle size='base'>Phases</PanelTitle>}
        extra={
          phaseGantt ? (
            <span className='injection-process__last-event-label'>
              {`${String(phaseGantt.spans.length)} phases · ${formatMs(phaseGantt.totalMs)}`}
            </span>
          ) : undefined
        }
      >
        {phaseGantt ? (
          <TimelineChart
            spans={phaseGantt.spans}
            minNs={phaseGantt.minNs}
            maxNs={phaseGantt.maxNs}
          />
        ) : (
          <EmptyState
            title='No phase timeline yet'
            description='Pre / fault / post / recover windows will appear once the orchestrator records them.'
          />
        )}
      </Panel>

      <Panel
        title={<PanelTitle size='base'>Spans</PanelTitle>}
        extra={
          spanGroups.length > 0 ? (
            <span className='injection-process__last-event-label'>
              {`${String(spanGroups.length)} OTel traces · ${String(spansResp?.spans?.length ?? 0)} spans`}
            </span>
          ) : undefined
        }
      >
        {spanGroups.length > 0 ? (
          <div className='injection-process__span-groups'>
            {spanGroups.map((g) => (
              <div key={g.otelTraceId} className='injection-process__span-group'>
                <div className='injection-process__span-group-head'>
                  <MonoValue size='sm'>{g.otelTraceId}</MonoValue>
                  <span className='injection-process__last-event-label'>
                    {`${String(g.spans.length)} spans · ${formatMs(g.durationMs)}`}
                  </span>
                </div>
                <TraceTree spans={g.spans} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title='No spans ingested yet'
            description='OTel spans from the orchestrator land in ClickHouse via the otel-collector. If this stays empty after the trace completes, check the collector pipeline.'
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Events</PanelTitle>}>
        {events.length > 0 ? (
          <Terminal lines={events} />
        ) : (
          <EmptyState
            title='No events yet'
            description='Discrete state transitions emitted by the orchestrator will appear here.'
          />
        )}
      </Panel>

      <Panel
        title={<PanelTitle size='base'>Logs</PanelTitle>}
        extra={
          logsResp?.total_estimate != null ? (
            <span className='injection-process__last-event-label'>
              {`~${String(logsResp.total_estimate)} total`}
            </span>
          ) : undefined
        }
      >
        {logs.length > 0 ? (
          <Terminal lines={logs} />
        ) : (
          <EmptyState
            title='No logs yet'
            description='Per-service injection logs will stream here as the run progresses.'
          />
        )}
      </Panel>
    </>
  );
}
