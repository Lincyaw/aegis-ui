import { useMemo } from 'react';

import {
  Chip,
  EmptyState,
  PageSizeSelect,
  Panel,
  PanelTitle,
  SearchInput,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';
import type { TraceTraceLogEntry, TraceTraceLogsResp } from '@lincyaw/portal';

import type {
  LogLevelFilter,
  TraceLogFilters,
} from '../hooks/useTraceLogFilters';

import './TraceLogsPanel.css';

const LOG_LEVEL_OPTIONS: ReadonlyArray<{ key: LogLevelFilter; label: string }> =
  [
    { key: 'all', label: 'All' },
    { key: 'error', label: 'Error' },
    { key: 'warn', label: 'Warn' },
    { key: 'info', label: 'Info' },
  ];

const LOG_LIMIT_OPTIONS = [100, 200, 500, 1000];

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

function logLines(entries: TraceTraceLogEntry[] | undefined): TerminalLine[] {
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

interface TraceLogsPanelProps {
  filters: TraceLogFilters;
  data: TraceTraceLogsResp | undefined;
  /** Empty-state copy shown while no filter is active. */
  emptyTitle: string;
  emptyDescription: string;
}

export function TraceLogsPanel({
  filters,
  data,
  emptyTitle,
  emptyDescription,
}: TraceLogsPanelProps) {
  const lines = useMemo(() => logLines(data?.entries), [data?.entries]);
  const total = data?.total_estimate;

  return (
    <Panel
      title={<PanelTitle size='base'>Logs</PanelTitle>}
      extra={
        total != null ? (
          <span className='injection-process__last-event-label'>
            {`tail ${String(filters.limit)} · ~${String(total)} matched`}
          </span>
        ) : undefined
      }
    >
      <div className='trace-logs__toolbar'>
        <div
          className='trace-logs__levels'
          role='group'
          aria-label='Log level filter'
        >
          {LOG_LEVEL_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              tone={filters.level === opt.key ? 'ink' : 'ghost'}
              onClick={() => {
                filters.setLevel(opt.key);
              }}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
        <SearchInput
          value={filters.search}
          onChange={filters.setSearch}
          onClear={() => {
            filters.setSearch('');
          }}
          placeholder='Filter log lines…'
          className='trace-logs__search'
        />
        <PageSizeSelect
          value={filters.limit}
          onChange={filters.setLimit}
          options={LOG_LIMIT_OPTIONS}
          label='Tail'
          placement='bottom'
        />
      </div>
      {lines.length > 0 ? (
        <Terminal lines={lines} />
      ) : filters.active ? (
        <EmptyState
          title='No log entries match'
          description='No log entries match the current filters. Try clearing the search or selecting "All" level.'
        />
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </Panel>
  );
}
