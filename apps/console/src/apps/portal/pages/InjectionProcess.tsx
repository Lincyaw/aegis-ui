import { useParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  KeyValueList,
  MonoValue,
  Panel,
  PanelTitle,
  TimeDisplay,
  Timeline,
  type TimelineItem,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { TaskResp, TraceTraceDetailResp } from '@lincyaw/portal';

import { useInjectionDetail, useProcessTrace } from '../api/injections';
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

function taskTimelineItems(
  tasks: TaskResp[] | undefined,
  onTaskClick: (taskId: string) => void
): TimelineItem[] {
  if (!tasks || tasks.length === 0) {
    return [];
  }
  return [...tasks]
    .sort((a, b) => {
      const ax = a.created_at ?? '';
      const bx = b.created_at ?? '';
      return ax.localeCompare(bx);
    })
    .map((t, i) => {
      const id = t.id ?? `task-${String(i)}`;
      const state = t.state ?? t.status ?? 'pending';
      return {
        id,
        title: (
          <button
            type='button'
            className='injection-process__task-link'
            onClick={() => {
              if (t.id) {
                onTaskClick(t.id);
              }
            }}
          >
            {t.type ?? 'task'}
          </button>
        ),
        description: <MonoValue size='sm'>{t.id ?? '—'}</MonoValue>,
        meta: <StatusChip status={state} />,
        timestamp: t.created_at ? (
          <TimeDisplay value={t.created_at} />
        ) : undefined,
      };
    });
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
          k: 'group',
          v: <MonoValue size='sm'>{trace.group_id ?? '—'}</MonoValue>,
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
        {
          k: 'leaf tasks',
          v: String(trace.leaf_num ?? trace.tasks?.length ?? 0),
        },
      ]}
    />
  );
}

export default function InjectionProcess() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const { data: injection } = useInjectionDetail(
    Number.isNaN(idNum) ? null : idNum,
  );

  const traceId = injection?.trace_id ?? null;
  const {
    data: trace,
    isLoading,
    isError,
    error,
  } = useProcessTrace(traceId);

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

  const tasks = trace.tasks ?? [];
  const items = taskTimelineItems(tasks, (taskId) => {
    navigate(`tasks/${taskId}`);
  });

  return (
    <>
      <Panel title={<PanelTitle size='base'>Process trace</PanelTitle>}>
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
        title={<PanelTitle size='base'>Tasks</PanelTitle>}
        extra={<Chip tone='ghost'>{`${String(tasks.length)} total`}</Chip>}
      >
        {items.length > 0 ? (
          <Timeline items={items} />
        ) : (
          <EmptyState
            title='No tasks yet'
            description='Tasks will appear here as the orchestrator schedules them.'
          />
        )}
      </Panel>
    </>
  );
}
