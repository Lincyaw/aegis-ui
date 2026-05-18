import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  KeyValueList,
  MonoValue,
  PageHeader,
  PageSizeSelect,
  Panel,
  PanelTitle,
  SearchInput,
  Terminal,
  type TerminalLine,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import type {
  ExecutionDetectorResultItem,
  TraceTraceLogEntry,
} from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { useTraceLogs } from '../api/traces';
import { StatusChip } from '../components/StatusChip';
import { useExecutionDetail } from '../hooks/useExecutions';
import { isActiveTaskState, useCancelTask } from '../hooks/useTasks';

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

function logLevelClass(level: string | undefined): TerminalLine['level'] {
  const lower = (level ?? '').toLowerCase();
  if (lower === 'error' || lower === 'fatal') {
    return 'error';
  }
  if (lower === 'warn' || lower === 'warning') {
    return 'warn';
  }
  if (lower === 'debug' || lower === 'trace') {
    return 'debug';
  }
  return 'info';
}

function logLines(
  entries: TraceTraceLogEntry[] | undefined,
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

  const [logLevel, setLogLevel] = useState<LogLevelFilter>('all');
  const [logSearchInput, setLogSearchInput] = useState('');
  const [logLimit, setLogLimit] = useState<number>(200);
  const debouncedLogSearch = useDebouncedValue(logSearchInput.trim(), 300);

  const { data: logsResp } = useTraceLogs(
    traceId,
    {
      limit: logLimit,
      level: logLevel === 'all' ? undefined : logLevel,
      q: debouncedLogSearch.length > 0 ? debouncedLogSearch : undefined,
    },
    live ? 3_000 : false,
  );
  const allLogLines = useMemo(
    () => logLines(logsResp?.entries),
    [logsResp?.entries],
  );
  const filteredLogLines = useMemo<TerminalLine[]>(
    () => allLogLines.slice(-logLimit),
    [allLogLines, logLimit],
  );

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <EmptyState title='Loading…' description='Fetching execution.' />
        </Panel>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <ErrorState
            title='Not found'
            description={
              error instanceof Error ? error.message : 'Unknown execution.'
            }
          />
        </Panel>
      </div>
    );
  }

  const taskId = data?.task_id ?? null;
  const cancellable = typeof taskId === 'string' && taskId.length > 0 && live;
  const detectorResults = data.detector_results ?? [];

  return (
    <div className='page-wrapper'>
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
              v: live ? (
                '—'
              ) : (
                <TimeDisplay value={data.updated_at ?? ''} />
              ),
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
      <Panel
        title={<PanelTitle size='base'>Logs</PanelTitle>}
        extra={
          allLogLines.length > 0 ? (
            <span className='injection-process__last-event-label'>
              {`tail ${String(logLimit)} · ${String(filteredLogLines.length)} / ${String(allLogLines.length)}`}
            </span>
          ) : undefined
        }
      >
        <div className='injection-process__logs-toolbar'>
          <div
            className='injection-process__logs-levels'
            role='group'
            aria-label='Log level filter'
          >
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
        {filteredLogLines.length > 0 ? (
          <Terminal lines={filteredLogLines} />
        ) : (
          <EmptyState
            title={
              traceId ? 'No log entries match' : 'No orchestrator trace yet'
            }
            description={
              traceId
                ? debouncedLogSearch.length > 0 || logLevel !== 'all'
                  ? 'No entries match the current filters. Try clearing the search or selecting "All" level.'
                  : 'Log entries from the orchestrator will appear here as the run progresses.'
                : 'The execution has not been dispatched to the orchestrator.'
            }
          />
        )}
      </Panel>
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
    </div>
  );
}
