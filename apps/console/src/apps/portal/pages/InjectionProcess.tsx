import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SkeletonText,
  Terminal,
  TimeDisplay,
  TimelineChart,
  type TraceSpan,
  TraceSpanInspector,
  TraceTree,
} from '@lincyaw/aegis-ui';
import type { TaskResp, TraceTraceDetailResp } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useInjectionDetail, useInjectionTimeline } from '../api/injections';
import { pollMs, type RefreshInterval } from '../api/polling';
import { useCancelTask } from '../api/tasks';
import { useProcessTrace, useTraceLogs, useTraceSpans } from '../api/traces';
import { LoadError } from '../components/LoadError';
import { RefreshControl } from '../components/RefreshControl';
import { StatusChip } from '../components/StatusChip';
import { TraceLogsPanel } from '../components/TraceLogsPanel';
import { isActive } from '../domain/status';
import {
  buildPhaseGantt,
  formatElapsed,
  formatMs,
  groupSpansByOTelTrace,
  timelineEventLines,
} from '../domain/traceSpans';
import { useTraceLogFilters } from '../hooks/useTraceLogFilters';

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

interface StageCardProps {
  task: TaskResp;
  onCancel: (taskId: string) => void;
  cancelPending: boolean;
}

function StageCard({ task, onCancel, cancelPending }: StageCardProps) {
  const state = task.state ?? task.status;
  const cancellable = Boolean(task.id) && isActive(state);
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
            v: task.created_at ? <TimeDisplay value={task.created_at} /> : '—',
          },
          {
            k: 'updated at',
            v: task.updated_at ? <TimeDisplay value={task.updated_at} /> : '—',
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
  const state = trace.state ?? trace.status;
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
          v: trace.start_time ? <TimeDisplay value={trace.start_time} /> : '—',
        },
        {
          k: 'ended',
          v: trace.end_time ? <TimeDisplay value={trace.end_time} /> : '—',
        },
        {
          k: 'duration',
          v: formatElapsed(trace.start_time, trace.end_time),
        },
      ]}
    />
  );
}

export default function InjectionProcess() {
  const { injectionId } = useParams<{ injectionId: string }>();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const validId = Number.isNaN(idNum) ? undefined : idNum;
  const { data: injection } = useInjectionDetail(validId);

  const traceId = injection?.trace_id;
  const [refresh, setRefresh] = useState<RefreshInterval>('auto');

  const {
    data: trace,
    isLoading,
    isError,
    error,
    isFetching: traceFetching,
    refetch: refetchTrace,
  } = useProcessTrace(traceId, refresh);
  const live = isActive(trace?.state ?? trace?.status);
  const intervalMs = pollMs(refresh, live);

  const {
    data: timeline,
    isFetching: timelineFetching,
    refetch: refetchTimeline,
  } = useInjectionTimeline(validId, intervalMs);

  const logFilters = useTraceLogFilters();
  const {
    data: logsResp,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useTraceLogs(traceId, logFilters.query, intervalMs);

  const {
    data: spansResp,
    isFetching: spansFetching,
    refetch: refetchSpans,
  } = useTraceSpans(traceId, intervalMs);
  const spanGroups = useMemo(
    () => groupSpansByOTelTrace(spansResp?.spans),
    [spansResp?.spans]
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
  const cancelTask = useCancelTask();
  const cancelStage = (taskId: string): void => {
    cancelTask.mutate(taskId, {
      onSuccess: () => {
        void msg.success('Stage cancelled');
      },
      onError: (err) => {
        void msg.error(`Cancel failed: ${errMsg(err)}`);
      },
    });
  };

  const phaseGantt = useMemo(
    () => (timeline ? buildPhaseGantt(timeline) : null),
    [timeline]
  );
  const events = useMemo(
    () => timelineEventLines(timeline?.events),
    [timeline?.events]
  );

  if (!injection) {
    return (
      <Panel>
        <SkeletonText />
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

  if (isLoading || isError || !trace) {
    return (
      <Panel>
        {isError ? (
          <LoadError
            error={error}
            title='Failed to load the process trace'
            notFound={{
              title: 'No process trace yet',
              description: 'The orchestrator has not reported this trace.',
            }}
          />
        ) : (
          <SkeletonText />
        )}
      </Panel>
    );
  }

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
            <MetricLabel size='xs'>last event</MetricLabel>
            <MonoValue size='sm'>{trace.last_event}</MonoValue>
          </div>
        )}
      </Panel>

      <Panel
        title={<PanelTitle size='base'>Fault windows on SUT</PanelTitle>}
        extra={
          phaseGantt ? (
            <MetricLabel size='xs'>
              {`${String(phaseGantt.spans.length)} windows · ${formatMs(phaseGantt.totalMs)}`}
            </MetricLabel>
          ) : undefined
        }
      >
        {phaseGantt ? (
          <TimelineChart
            spans={phaseGantt.spans}
            minMs={0}
            maxMs={phaseGantt.maxMs}
          />
        ) : (
          <EmptyState
            title='No phase timeline yet'
            description='Pre / fault / recover / post windows on the system under test. Pinned by the backend; not the orchestrator pipeline stages (those are in the Stages panel).'
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
                onCancel={cancelStage}
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
            <MetricLabel size='xs'>
              {`${String(spanGroups.length)} OTel traces · ${String(spansResp?.spans?.length ?? 0)} spans`}
            </MetricLabel>
          ) : undefined
        }
      >
        {spanGroups.length > 0 ? (
          <div className='injection-process__span-groups'>
            {spanGroups.map((g) => (
              <div
                key={g.otelTraceId}
                className='injection-process__span-group'
              >
                <div className='injection-process__span-group-head'>
                  <MonoValue size='sm'>{g.otelTraceId}</MonoValue>
                  <MetricLabel size='xs'>
                    {`${String(g.spans.length)} spans · ${formatMs(g.durationMs)}`}
                  </MetricLabel>
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

      <TraceLogsPanel
        filters={logFilters}
        data={logsResp}
        emptyTitle='No logs yet'
        emptyDescription='Per-service injection logs will stream here as the run progresses.'
      />
    </>
  );
}
