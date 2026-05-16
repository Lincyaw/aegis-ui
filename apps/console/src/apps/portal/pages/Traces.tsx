import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  TextField,
  TimeDisplay,
  TimeRangePicker,
  useAppHref,
} from '@lincyaw/aegis-ui';
import type { ObservationSpanSummary } from '@lincyaw/portal';

import { useSpansList } from '../hooks/observability';

const PAGE_SIZE = 50;

export default function Traces() {
  const [params, setParams] = useSearchParams();
  const href = useAppHref();
  const injectionParam = params.get('injection');
  const injectionId =
    injectionParam !== null && /^\d+$/.test(injectionParam)
      ? Number(injectionParam)
      : null;

  const [range, setRange] = useState('now-1h');
  const [service, setService] = useState('');
  const [op, setOp] = useState('');
  const [status, setStatus] = useState('');
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [pageIdx, setPageIdx] = useState(0);

  const resetPaging = (): void => {
    setCursors([undefined]);
    setPageIdx(0);
  };

  const query = useSpansList({
    injectionId,
    range,
    service: service.length > 0 ? service : undefined,
    op: op.length > 0 ? op : undefined,
    status: status.length > 0 ? status : undefined,
    limit: PAGE_SIZE,
    cursor: cursors[pageIdx],
  });

  const spans = query.data?.spans ?? [];
  const nextCursor = query.data?.next_cursor;

  const updateInjection = (value: string): void => {
    const next = new URLSearchParams(params);
    if (value.length === 0) {
      next.delete('injection');
    } else {
      next.set('injection', value);
    }
    setParams(next, { replace: true });
    resetPaging();
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Traces'
        description='OTel trace summaries for the selected injection datapack.'
        action={
          <TimeRangePicker
            value={range}
            onChange={(v) => {
              setRange(v);
              resetPaging();
            }}
          />
        }
      />

      <Panel>
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          <TextField
            label='Injection ID'
            value={injectionParam ?? ''}
            placeholder='e.g. 42'
            onChange={(e) => {
              updateInjection(e.target.value);
            }}
          />
          <TextField
            label='Service'
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              resetPaging();
            }}
          />
          <TextField
            label='Operation'
            value={op}
            onChange={(e) => {
              setOp(e.target.value);
              resetPaging();
            }}
          />
          <TextField
            label='Status (ok|error)'
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetPaging();
            }}
          />
        </div>
      </Panel>

      {injectionId === null ? (
        <Panel>
          <EmptyState
            title='Pick an injection'
            description='Append ?injection=<id> to scope the trace listing.'
          />
        </Panel>
      ) : (
        <Panel>
          {query.isError ? (
            <ErrorState
              title='Failed to load traces'
              description={String(query.error ?? '')}
            />
          ) : query.isLoading ? (
            <EmptyState title='Loading…' />
          ) : spans.length === 0 ? (
            <EmptyState
              title='No traces in range'
              description='Widen the time range or relax filters.'
            />
          ) : (
            <>
              <DataTable<ObservationSpanSummary>
                data={spans}
                rowKey={(r) => r.trace_id ?? ''}
                columns={[
                  {
                    key: 'id',
                    header: 'Trace',
                    render: (r) => (
                      <Link
                        to={href(
                          `traces/${encodeURIComponent(
                            r.trace_id ?? ''
                          )}?injection=${String(injectionId)}`
                        )}
                      >
                        <MonoValue size='sm'>{r.trace_id ?? '—'}</MonoValue>
                      </Link>
                    ),
                  },
                  {
                    key: 'svc',
                    header: 'Root service',
                    render: (r) => r.root_service ?? '—',
                  },
                  {
                    key: 'op',
                    header: 'Root op',
                    render: (r) => r.root_op ?? '—',
                  },
                  {
                    key: 'dur',
                    header: 'Duration',
                    render: (r) => (
                      <MonoValue size='sm'>
                        {r.duration_ns !== undefined
                          ? `${(r.duration_ns / 1_000_000).toFixed(1)} ms`
                          : '—'}
                      </MonoValue>
                    ),
                  },
                  {
                    key: 'err',
                    header: 'Errors',
                    render: (r) =>
                      (r.error_count ?? 0) > 0 ? (
                        <Chip tone='warning'>{r.error_count}</Chip>
                      ) : (
                        <Chip tone='ghost'>0</Chip>
                      ),
                  },
                  {
                    key: 'started',
                    header: 'Started',
                    render: (r) =>
                      r.start_ts !== undefined ? (
                        <TimeDisplay value={r.start_ts} />
                      ) : (
                        '—'
                      ),
                  },
                ]}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-3)',
                }}
              >
                <Button
                  tone='secondary'
                  disabled={pageIdx === 0}
                  onClick={() => {
                    setPageIdx((i) => Math.max(0, i - 1));
                  }}
                >
                  Prev
                </Button>
                <Button
                  tone='secondary'
                  disabled={nextCursor === undefined || nextCursor.length === 0}
                  onClick={() => {
                    if (nextCursor !== undefined && nextCursor.length > 0) {
                      const next = [...cursors];
                      next[pageIdx + 1] = nextCursor;
                      setCursors(next);
                      setPageIdx((i) => i + 1);
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
