import { useParams } from 'react-router-dom';

import {
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import type { ExecutionDetectorResultItem } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { useTraceLogs } from '../api/traces';
import { StatusChip } from '../components/StatusChip';
import { TraceLogsPanel } from '../components/TraceLogsPanel';
import { useExecutionDetail } from '../hooks/useExecutions';
import { isActiveTaskState, useCancelTask } from '../hooks/useTasks';
import { useTraceLogFilters } from '../hooks/useTraceLogFilters';

function fmtNum(n: number | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) {
    return '—';
  }
  return n.toFixed(digits);
}

const DETECTOR_COLUMNS: Array<DataTableColumn<ExecutionDetectorResultItem>> = [
  {
    key: 'span_name',
    header: 'Span',
    render: (row) => <MonoValue size='sm'>{row.span_name}</MonoValue>,
    resizable: true,
  },
  {
    key: 'issues',
    header: 'Issues',
    render: (row) => row.issues,
    resizable: true,
  },
  {
    key: 'abnormal_succ_rate',
    header: 'Abnormal succ',
    align: 'right',
    render: (row) => (
      <MonoValue size='sm'>{fmtNum(row.abnormal_succ_rate, 3)}</MonoValue>
    ),
  },
  {
    key: 'normal_succ_rate',
    header: 'Normal succ',
    align: 'right',
    render: (row) => (
      <MonoValue size='sm'>{fmtNum(row.normal_succ_rate, 3)}</MonoValue>
    ),
  },
  {
    key: 'abnormal_p95',
    header: 'Abn p95',
    align: 'right',
    render: (row) => (
      <MonoValue size='sm'>{fmtNum(row.abnormal_p95, 1)}</MonoValue>
    ),
  },
  {
    key: 'normal_p95',
    header: 'Norm p95',
    align: 'right',
    render: (row) => (
      <MonoValue size='sm'>{fmtNum(row.normal_p95, 1)}</MonoValue>
    ),
  },
];

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const numericId = executionId ? Number(executionId) : undefined;
  const { data, isLoading, isError, error } = useExecutionDetail(numericId);

  const traceId = data?.trace_id ?? null;
  const state = data?.state ?? data?.status ?? 'pending';
  const live = isActiveTaskState(state);

  const { message: msg } = AntdApp.useApp();
  const cancelTask = useCancelTask(() => {
    void msg.success('Run cancelled');
  });

  const logFilters = useTraceLogFilters();
  const { data: logsResp } = useTraceLogs(
    traceId,
    logFilters.query,
    live ? 3_000 : false
  );

  if (isLoading) {
    return (
      <>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <EmptyState title='Loading…' description='Fetching execution.' />
        </Panel>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <ErrorState
            title='Not found'
            description={
              error instanceof Error ? error.message : 'Unknown execution.'
            }
          />
        </Panel>
      </>
    );
  }

  const taskId = data?.task_id ?? null;
  const cancellable = typeof taskId === 'string' && taskId.length > 0 && live;
  const detectorResults = data.detector_results ?? [];

  return (
    <>
      <PageHeader
        title={`Execution ${String(data.id ?? '')}`}
        description={`${data.algorithm_name ?? 'algorithm'} · ${data.datapack_name ?? 'datapack'}`}
        action={<StatusChip status={state} />}
      />
      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'algorithm', v: data.algorithm_name ?? '—' },
            { k: 'version', v: data.algorithm_version ?? '—' },
            {
              k: 'datapack',
              v: <MonoValue size='sm'>{data.datapack_name ?? '—'}</MonoValue>,
            },
            {
              k: 'run id',
              v: <MonoValue size='sm'>{data.task_id ?? '—'}</MonoValue>,
            },
            {
              k: 'duration',
              v:
                data.duration != null
                  ? `${(data.duration / 1000).toFixed(1)}s`
                  : '—',
            },
          ]}
        />
      </Panel>
      {data.granularity_results && data.granularity_results.length > 0 && (
        <Panel title={<PanelTitle size='base'>Granularity results</PanelTitle>}>
          <KeyValueList
            items={data.granularity_results.map((g) => ({
              k: `${g.level} #${String(g.rank)}`,
              v: (
                <span>
                  <MonoValue size='sm'>{g.result}</MonoValue>
                  {g.confidence != null &&
                    ` (${(g.confidence * 100).toFixed(1)}%)`}
                </span>
              ),
            }))}
          />
        </Panel>
      )}
      <Panel title={<PanelTitle size='base'>Run state</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'state', v: <StatusChip status={state} /> },
            {
              k: 'started',
              v: <TimeDisplay value={data.created_at ?? ''} />,
            },
            {
              k: 'finished',
              v: live ? '—' : <TimeDisplay value={data.updated_at ?? ''} />,
            },
            {
              k: 'trace id',
              v: <MonoValue size='sm'>{traceId ?? '—'}</MonoValue>,
            },
          ]}
        />
        {cancellable && (
          <div className='injection-process__stage-actions'>
            <Button
              tone='secondary'
              disabled={cancelTask.isPending}
              onClick={() => {
                if (typeof taskId === 'string') {
                  cancelTask.mutate(taskId);
                }
              }}
            >
              {cancelTask.isPending ? 'Cancelling…' : 'Cancel'}
            </Button>
          </div>
        )}
      </Panel>
      <TraceLogsPanel
        filters={logFilters}
        data={logsResp}
        emptyTitle={traceId ? 'No logs yet' : 'No orchestrator trace yet'}
        emptyDescription={
          traceId
            ? 'Log entries from the orchestrator will appear here as the run progresses.'
            : 'The execution has not been dispatched to the orchestrator.'
        }
      />
      <Panel
        title={<PanelTitle size='base'>Detector results</PanelTitle>}
        extra={
          detectorResults.length > 0 ? (
            <span className='injection-process__last-event-label'>
              {`${String(detectorResults.length)} spans`}
            </span>
          ) : undefined
        }
      >
        {detectorResults.length > 0 ? (
          <DataTable
            columns={DETECTOR_COLUMNS}
            data={detectorResults}
            rowKey={(row, i) => `${row.span_name}-${String(i)}`}
            persistKey='execution-detail-detector'
          />
        ) : (
          <EmptyState
            title='No detector results uploaded yet'
            description='Detector results land here once the algorithm reports anomaly windows for the run.'
          />
        )}
      </Panel>
    </>
  );
}
