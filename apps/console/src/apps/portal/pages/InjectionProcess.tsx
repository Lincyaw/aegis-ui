import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageSizeSelect,
  Panel,
  PanelTitle,
  SearchInput,
  Terminal,
  type TerminalLine,
  TimeDisplay,
  TimelineChart,
  type TimelineSpan,
  TraceSpanInspector,
  TraceTree,
  type TraceSpan,
} from '@lincyaw/aegis-ui';
import type {
  InjectionInjectionLogEntry,
  InjectionInjectionTimelineEvent,
  InjectionInjectionTimelineResp,
  InjectionInjectionTimelineWindow,
  TaskResp,
  TraceSpanNode,
  TraceTraceDetailResp,
} from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

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
import { useCancelTask } from '../hooks/useTasks';

const STAGE_LABELS: Record<string, string> = {
  RestartPedestal: 'Restart pedestal',
  FaultInjection: 'Fault injection',
  BuildDataset: 'Build datapack',
  BuildDatapack: 'Build datapack',
  RunAlgorithm: 'Run algorithm',
  CollectResult: 'Collect result',
};

function stageLabel(type: string | undefined): string {
  if (!type) {
    return 'Stage';
  }
  return STAGE_LABELS[type] ?? type;
}

const CANCELLABLE_STAGE_STATES = new Set([
  'pending',
  'rescheduled',
  'running',
  'initial',
  'queued',
]);

function isCancellableStage(state: string | undefined): boolean {
  return state ? CANCELLABLE_STAGE_STATES.has(state.toLowerCase()) : false;
}

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

interface StageCardProps {
  task: TaskResp;
  onCancel: (taskId: string) => void;
  cancelPending: boolean;
}

function StageCard({ task, onCancel, cancelPending }: StageCardProps) {
  const state = task.state ?? task.status ?? 'pending';
  const cancellable =
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    isCancellableStage(state);
  return (
    <div className='injection-process__stage'>
      <div className='injection-process__stage-head'>
        <PanelTitle size='sm' as='span'>
          {stageLabel(task.type)}
        </PanelTitle>
        <StatusChip status={state} />
      </div>
      <KeyValueList
        items={[
          {
            k: 'started at',
            v: <TimeDisplay value={task.created_at ?? ''} />,
          },
          {
            k: 'updated at',
            v: <TimeDisplay value={task.updated_at ?? ''} />,
          },
          {
            k: 'trace id',
            v: <MonoValue size='sm'>{task.trace_id ?? '—'}</MonoValue>,
          },
        ]}
      />
      {cancellable && (
        <div className='injection-process__stage-actions'>
          <Button
            tone='secondary'
            disabled={cancelPending}
            onClick={() => {
              if (typeof task.id === 'string') {
                onCancel(task.id);
              }
            }}
          >
            {cancelPending ? 'Cancelling…' : 'Cancel'}
          </Button>
        </div>
      )}
    </div>
  );
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

type LogLevelFilter = 'all' | 'error' | 'warn' | 'info';

const LOG_LEVEL_OPTIONS: ReadonlyArray<{ key: LogLevelFilter; label: string }> =
  [
    { key: 'all', label: 'All' },
    { key: 'error', label: 'Error' },
    { key: 'warn', label: 'Warn' },
    { key: 'info', label: 'Info' },
  ];

const LOG_LIMIT_OPTIONS: readonly number[] = [100, 200, 500, 1000];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(handle);
    };
  }, [value, delayMs]);
  return debounced;
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

  const [logLevel, setLogLevel] = useState<LogLevelFilter>('all');
  const [logSearchInput, setLogSearchInput] = useState('');
  const [logLimit, setLogLimit] = useState<number>(200);
  const debouncedLogSearch = useDebouncedValue(logSearchInput.trim(), 300);
  const {
    data: logsResp,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useInjectionLogs(
    validId,
    {
      limit: logLimit,
      level: logLevel === 'all' ? undefined : logLevel,
      q: debouncedLogSearch.length > 0 ? debouncedLogSearch : undefined,
    },
    intervalMs,
  );

  const {
    data: spansResp,
    isFetching: spansFetching,
    refetch: refetchSpans,
  } = useTraceSpans(traceId, intervalMs);
  const spanGroups = useMemo(
    () => groupSpansByOTelTrace(spansResp?.spans),
    [spansResp?.spans],
  );
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const spanLookup = useMemo(() => {
    const map = new Map<string, TraceSpan>();
    spanGroups.forEach((g) => {
      g.spans.forEach((s) => {
        map.set(s.id, s);
      });
    });
    return (id: string): TraceSpan | undefined => map.get(id);
  }, [spanGroups]);

  const { message: msg } = AntdApp.useApp();
  const cancelTask = useCancelTask(() => {
    void msg.success('Stage cancelled');
  });

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
        title={<PanelTitle size='base'>Fault windows on SUT</PanelTitle>}
        extra={
          phaseGantt ? (
            <span className='injection-process__last-event-label'>
              {`${String(phaseGantt.spans.length)} windows · ${formatMs(phaseGantt.totalMs)}`}
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
            description='Pre / fault / recover / post windows on the system under test. Pinned by the backend; not the orchestrator pipeline stages (those are in the Spans panel).'
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Stages</PanelTitle>}>
        {trace.tasks && trace.tasks.length > 0 ? (
          <div className='injection-process__stages'>
            {trace.tasks.map((task, i) => (
              <StageCard
                key={task.id ?? `stage-${String(i)}`}
                task={task}
                onCancel={(id) => {
                  cancelTask.mutate(id);
                }}
                cancelPending={
                  cancelTask.isPending && cancelTask.variables === task.id
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title='No stages yet'
            description='Orchestrator stages will appear here as the run progresses.'
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
                <TraceTree
                  spans={g.spans}
                  selectedId={selectedSpan?.id}
                  onSelect={setSelectedSpan}
                  persistKey='injection-process-spans'
                />
              </div>
            ))}
            <TraceSpanInspector
              span={selectedSpan}
              onClose={() => setSelectedSpan(null)}
              spanLookup={spanLookup}
              onSelectRelated={setSelectedSpan}
            />
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
              {`tail ${String(logLimit)} · ~${String(logsResp.total_estimate)} matched`}
            </span>
          ) : undefined
        }
      >
        <div className='injection-process__logs-toolbar'>
          <div className='injection-process__logs-levels' role='group' aria-label='Log level filter'>
            {LOG_LEVEL_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                tone={logLevel === opt.key ? 'ink' : 'ghost'}
                onClick={() => {
                  setLogLevel(opt.key);
                }}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
          <SearchInput
            value={logSearchInput}
            onChange={setLogSearchInput}
            onClear={() => {
              setLogSearchInput('');
            }}
            placeholder='Filter log lines…'
            className='injection-process__logs-search'
          />
          <PageSizeSelect
            value={logLimit}
            onChange={setLogLimit}
            options={LOG_LIMIT_OPTIONS as number[]}
            label='Tail'
            placement='bottom'
          />
        </div>
        {logs.length > 0 ? (
          <Terminal lines={logs} />
        ) : (
          <EmptyState
            title='No logs match'
            description={
              debouncedLogSearch.length > 0 || logLevel !== 'all'
                ? 'No log entries match the current filters. Try clearing the search or selecting "All" level.'
                : 'Per-service injection logs will stream here as the run progresses.'
            }
          />
        )}
      </Panel>
    </>
  );
}
