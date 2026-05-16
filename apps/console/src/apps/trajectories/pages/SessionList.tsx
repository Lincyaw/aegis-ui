import { type ReactElement, useEffect, useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Link } from 'react-router-dom';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  ErrorState,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  parseTimeRangeInput,
  TimeDisplay,
  TimeRangePicker,
  Toolbar,
} from '@lincyaw/aegis-ui';

import { type SessionSummary, listSessions } from '../api/clickhouse';
import { useCompareList } from '../compareList';
import { formatDurationMs, formatTokens } from '../conversation';

const SINCE_PRESETS = [
  { label: '1h', value: 'now-1h' },
  { label: '24h', value: 'now-24h' },
  { label: '7d', value: 'now-7d' },
  { label: '30d', value: 'now-30d' },
];

const DEFAULT_SINCE = 'now-7d';

export function SessionList(): ReactElement {
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useQueryState(
    'since',
    parseAsString.withDefault(DEFAULT_SINCE),
  );
  const [search, setSearch] = useQueryState(
    'q',
    parseAsString.withDefault(''),
  );
  const { pinned, toggle } = useCompareList();

  const range =
    parseTimeRangeInput(since) ?? parseTimeRangeInput(DEFAULT_SINCE);
  const sinceHours = range
    ? Math.max(
        1,
        Math.ceil((range.to.getTime() - range.from.getTime()) / 3_600_000),
      )
    : 168;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSessions({ sinceHours, search, limit: 200 })
      .then((data) => {
        if (!cancelled) {
          setRows(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sinceHours, search]);

  const columns: Array<DataTableColumn<SessionSummary>> = [
    {
      key: 'session',
      header: 'Agent tree',
      width: 240,
      render: (r) => (
        <Link
          to={r.rootSessionId}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <MonoValue size='sm'>{r.sessionId.slice(0, 16)}</MonoValue>
          <MetricLabel size='xs'>
            {r.serviceName}
            {r.sessionCount > 1 ? ` · ${r.sessionCount.toString()} sessions` : ''}
          </MetricLabel>
        </Link>
      ),
      truncate: false,
    },
    {
      key: 'started',
      header: 'Started',
      width: 160,
      render: (r) => <TimeDisplay value={r.startedAt} />,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      width: 100,
      render: (r) => (
        <MonoValue size='sm'>{formatDurationMs(r.durationMs)}</MonoValue>
      ),
    },
    {
      key: 'turns',
      header: 'Turns',
      align: 'right',
      width: 80,
      render: (r) => <MonoValue size='sm'>{r.turnCount}</MonoValue>,
    },
    {
      key: 'tools',
      header: 'Tools',
      align: 'right',
      width: 80,
      render: (r) => <MonoValue size='sm'>{r.toolCount}</MonoValue>,
    },
    {
      key: 'tokens',
      header: 'Tokens (in / out)',
      align: 'right',
      width: 160,
      render: (r) => (
        <MonoValue size='sm'>
          {formatTokens(r.inputTokens)} / {formatTokens(r.outputTokens)}
        </MonoValue>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      render: (r) => <MonoValue size='sm'>{r.model}</MonoValue>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (r) =>
        r.errorCount > 0 ? (
          <Chip tone='warning'>{r.errorCount} error</Chip>
        ) : (
          <Chip tone='ghost'>ok</Chip>
        ),
      truncate: false,
    },
    {
      key: 'pin',
      header: '',
      width: 60,
      render: (r) => {
        const isPinned = pinned.includes(r.rootSessionId);
        return (
          <Chip
            tone={isPinned ? 'ink' : 'default'}
            onClick={() => toggle(r.rootSessionId)}
          >
            {isPinned ? '★' : '☆'}
          </Chip>
        );
      },
      truncate: false,
    },
  ];

  return (
    <Panel
      title={<PanelTitle size='lg'>Agent sessions</PanelTitle>}
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pinned.length > 0 && (
            <Link to='compare' style={{ textDecoration: 'none' }}>
              <Chip tone='ink'>★ {pinned.length}/2 → compare</Chip>
            </Link>
          )}
          <MetricLabel>otel · clickhouse</MetricLabel>
        </div>
      }
    >
      <Toolbar
        searchPlaceholder='session_id / trace_id / service'
        searchValue={search}
        onSearchChange={(v) => void setSearch(v)}
        filters={[]}
        action={
          <TimeRangePicker
            value={since}
            onChange={(v) => void setSince(v)}
            presets={SINCE_PRESETS}
          />
        }
      />
      <div style={{ marginTop: 16 }}>
        {error ? (
          <ErrorState
            title='ClickHouse query failed'
            description={error}
          />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.rootSessionId}
            loading={loading}
            emptyTitle='No sessions in window'
            emptyDescription='Try widening the time range or clearing the search.'
            persistKey='trajectories.sessions'
          />
        )}
      </div>
    </Panel>
  );
}

export default SessionList;
