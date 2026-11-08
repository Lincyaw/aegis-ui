import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  ErrorState,
  EventTable,
  type EventTableColumn,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  parseTimeRangeInput,
  QueryAutocomplete,
  TimeDisplay,
  TimeRangePicker,
  Toolbar,
} from '@lincyaw/aegis-ui';
import { parseAsString, useQueryState } from 'nuqs';

import { listSessionRows, type SessionRow } from '../api/clickhouse';
import { compileLuceneToSql } from '../api/luceneToSql';
import { useCompareList } from '../compareList';
import { formatTokens } from '../format';
import {
  SESSION_FIELD_MAPPINGS,
  SESSION_FIELD_SUGGESTIONS,
  suggestSessionFieldValues,
} from '../sessionFields';

import './SessionList.css';

const SINCE_PRESETS = [
  { label: '1h', value: 'now-1h' },
  { label: '24h', value: 'now-24h' },
  { label: '7d', value: 'now-7d' },
  { label: '30d', value: 'now-30d' },
];

const DEFAULT_SINCE = 'now-7d';

function shortId(value: string | undefined, length: number): string {
  return value ? value.slice(0, length) : '—';
}

export function SessionList(): ReactElement {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useQueryState(
    'since',
    parseAsString.withDefault(DEFAULT_SINCE)
  );
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const { pinned, toggle } = useCompareList();

  const range =
    parseTimeRangeInput(since) ?? parseTimeRangeInput(DEFAULT_SINCE);
  const sinceHours = range
    ? Math.max(
        1,
        Math.ceil((range.to.getTime() - range.from.getTime()) / 3_600_000)
      )
    : 168;

  const compiled = useMemo(
    () =>
      compileLuceneToSql(search, {
        fields: SESSION_FIELD_MAPPINGS,
      }),
    [search]
  );

  const whereParams = useMemo(() => {
    // Strip Date-typed params — listSessionRows only ever needs primitives.
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(compiled.params)) {
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        out[k] = v;
      }
    }
    return out;
  }, [compiled.params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSessionRows({
      sinceHours,
      whereSql: compiled.sql,
      whereParams,
      limit: 200,
    })
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
  }, [sinceHours, compiled.sql, whereParams]);

  const columns: Array<EventTableColumn<SessionRow>> = [
    {
      key: 'session',
      header: 'Session',
      width: 260,
      render: (r) => (
        <Link
          to={r.sessionId || '#'}
          className='trajectories-list__link trajectories-list__session'
        >
          <MonoValue size='sm'>{shortId(r.sessionId, 16)}</MonoValue>
          <MetricLabel size='xs'>
            {r.scenario || 'unknown'}
            {r.lineageKind ? ` · ${r.lineageKind}` : ''}
          </MetricLabel>
        </Link>
      ),
      truncate: false,
    },
    {
      key: 'parent',
      header: 'Parent',
      width: 150,
      render: (r) =>
        r.parentSessionId ? (
          <Link to={r.parentSessionId} className='trajectories-list__link'>
            <MonoValue size='sm'>{r.parentSessionId.slice(0, 12)}</MonoValue>
          </Link>
        ) : (
          <MetricLabel size='xs'>Root</MetricLabel>
        ),
    },
    {
      key: 'started',
      header: 'Started',
      width: 160,
      render: (r) => <TimeDisplay value={r.startedAt} />,
    },
    {
      key: 'fork',
      header: 'Fork point',
      width: 140,
      render: (r) =>
        r.forkMessageId ? (
          <MonoValue size='sm'>{r.forkMessageId.slice(0, 12)}</MonoValue>
        ) : r.forkTurnIndex ? (
          <MonoValue size='sm'>turn {r.forkTurnIndex}</MonoValue>
        ) : (
          <MetricLabel size='xs'>—</MetricLabel>
        ),
    },
    {
      key: 'turns',
      header: 'Turns',
      numeric: true,
      width: 80,
      render: (r) => r.turnCount,
    },
    {
      key: 'tools',
      header: 'Tools',
      numeric: true,
      width: 80,
      render: (r) => r.toolCount,
    },
    {
      key: 'tokens',
      header: 'Tokens (in / out)',
      numeric: true,
      width: 160,
      render: (r) =>
        `${formatTokens(r.inputTokens)} / ${formatTokens(r.outputTokens)}`,
    },
    {
      key: 'root',
      header: 'Root',
      width: 150,
      render: (r) => (
        <MonoValue size='sm'>{shortId(r.rootSessionId, 12)}</MonoValue>
      ),
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
        const isPinned = pinned.includes(r.sessionId);
        return (
          <Button
            tone='ghost'
            aria-pressed={isPinned}
            aria-label={isPinned ? 'Unpin session' : 'Pin session'}
            title={isPinned ? 'Unpin session' : 'Pin session'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggle(r.sessionId);
            }}
          >
            {isPinned ? '★' : '☆'}
          </Button>
        );
      },
      truncate: false,
    },
  ];

  return (
    <Panel
      title={<PanelTitle size='lg'>Agent sessions</PanelTitle>}
      extra={
        <div className='trajectories-list__extra'>
          {pinned.length > 0 && (
            <Link to='compare' className='trajectories-list__link'>
              <Chip tone='ink'>★ {pinned.length}/2 → compare</Chip>
            </Link>
          )}
          <MetricLabel>otel · clickhouse</MetricLabel>
        </div>
      }
    >
      <Toolbar
        left={
          <div className='trajectories-list__search'>
            <QueryAutocomplete
              value={search}
              onChange={(v) => void setSearch(v)}
              fieldSuggestions={SESSION_FIELD_SUGGESTIONS}
              valueSuggestions={suggestSessionFieldValues}
              placeholder='scenario:rca AND lineage.kind:fork'
            />
          </div>
        }
        right={
          <TimeRangePicker
            value={since}
            onChange={(v) => void setSince(v)}
            presets={SINCE_PRESETS}
          />
        }
      />
      {compiled.referencedFields.length > 0 && (
        <MetricLabel size='xs' className='trajectories-list__explain'>
          {compiled.explanation}
        </MetricLabel>
      )}
      <div className='trajectories-list__table'>
        {error ? (
          <ErrorState title='ClickHouse query failed' description={error} />
        ) : (
          <EventTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.sessionId || `${r.startedAt}-${r.rootSessionId}`}
            loading={loading}
            emptyTitle='No sessions in window'
            emptyDescription='Try widening the time range or clearing the search.'
            maxVisibleRows={20}
          />
        )}
      </div>
    </Panel>
  );
}

export default SessionList;
