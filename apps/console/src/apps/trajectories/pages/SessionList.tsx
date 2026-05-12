import { type ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  ErrorState,
  type FilterChip,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  TimeDisplay,
  Toolbar,
} from '@lincyaw/aegis-ui';

import {
  type SessionSummary,
  listSessions,
} from '../api/clickhouse';
import { useCompareList } from '../compareList';
import { formatDurationMs, formatTokens } from '../conversation';

const SINCE_OPTIONS = [
  { hours: 1, label: '1h' },
  { hours: 24, label: '24h' },
  { hours: 168, label: '7d' },
  { hours: 720, label: '30d' },
];

export function SessionList(): ReactElement {
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinceHours, setSinceHours] = useState(168);
  const [search, setSearch] = useState('');
  const { pinned, toggle } = useCompareList();

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

  const filterChips: FilterChip[] = SINCE_OPTIONS.filter(
    (opt) => opt.hours === sinceHours,
  ).map((opt) => ({ key: `since:${opt.hours.toString()}`, label: `last ${opt.label}` }));

  return (
    <Panel
      title={<PanelTitle size='lg'>Agent sessions</PanelTitle>}
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pinned.length > 0 && (
            <Link
              to='compare'
              style={{ textDecoration: 'none' }}
            >
              <Chip tone='ink'>
                ★ {pinned.length}/2 → compare
              </Chip>
            </Link>
          )}
          <MetricLabel>otel · clickhouse</MetricLabel>
        </div>
      }
    >
      <Toolbar
        searchPlaceholder='session_id / trace_id / service'
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterChips}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {SINCE_OPTIONS.map((opt) => (
              <Chip
                key={opt.hours}
                tone={opt.hours === sinceHours ? 'ink' : 'default'}
                onClick={() => setSinceHours(opt.hours)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
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
