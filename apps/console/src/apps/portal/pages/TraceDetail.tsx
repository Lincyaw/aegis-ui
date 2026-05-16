import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  ErrorState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  type TraceSpan,
  TraceTree,
} from '@lincyaw/aegis-ui';
import type { ObservationSpanNode } from '@lincyaw/portal';

import { useSpanTree } from '../hooks/observability';

function statusOf(raw: string | undefined): TraceSpan['status'] {
  if (raw === undefined) {
    return 'unset';
  }
  const v = raw.toLowerCase();
  if (v === 'ok') {
    return 'ok';
  }
  if (v === 'error' || v === 'err') {
    return 'error';
  }
  return 'unset';
}

function kindFromOp(op: string | undefined): TraceSpan['kind'] {
  if (op === undefined) {
    return undefined;
  }
  const v = op.toLowerCase();
  if (v.startsWith('db') || v.startsWith('sql')) {
    return 'db';
  }
  if (v.startsWith('http') || v.startsWith('get ') || v.startsWith('post ')) {
    return 'http';
  }
  if (v.includes('redis') || v.includes('cache')) {
    return 'cache';
  }
  if (v.startsWith('rpc') || v.startsWith('grpc')) {
    return 'rpc';
  }
  return undefined;
}

function toTraceSpans(nodes: ObservationSpanNode[]): TraceSpan[] {
  if (nodes.length === 0) {
    return [];
  }
  const startTimes = nodes
    .map((n) => (n.start_ts !== undefined ? Date.parse(n.start_ts) : NaN))
    .filter((t) => Number.isFinite(t));
  const traceStart = startTimes.length > 0 ? Math.min(...startTimes) : 0;
  return nodes.map((n) => {
    const start =
      n.start_ts !== undefined ? Date.parse(n.start_ts) : traceStart;
    const end = n.end_ts !== undefined ? Date.parse(n.end_ts) : start;
    return {
      id: n.span_id ?? '',
      parentId:
        n.parent_id !== undefined && n.parent_id.length > 0
          ? n.parent_id
          : undefined,
      name:
        n.op !== undefined && n.op.length > 0
          ? n.service !== undefined
            ? `${n.service} · ${n.op}`
            : n.op
          : (n.service ?? 'span'),
      startMs: Math.max(0, start - traceStart),
      durationMs: Math.max(0, end - start),
      status: statusOf(n.status),
      kind: kindFromOp(n.op),
      attrs: n.attrs,
    };
  });
}

export default function TraceDetail() {
  const { traceId } = useParams<{ traceId: string }>();
  const [params] = useSearchParams();
  const injectionParam = params.get('injection');
  const injectionId =
    injectionParam !== null && /^\d+$/.test(injectionParam)
      ? Number(injectionParam)
      : null;

  const query = useSpanTree(injectionId, traceId ?? null);

  const spans = useMemo<TraceSpan[]>(
    () => toTraceSpans(query.data?.spans ?? []),
    [query.data]
  );

  const rootSpan = spans.find((s) => s.parentId === undefined) ?? spans[0];
  const errorCount = spans.filter((s) => s.status === 'error').length;
  const totalDuration = rootSpan?.durationMs ?? 0;

  if (injectionId === null) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Trace ${traceId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Missing injection scope'
            description='Append ?injection=<id> — span trees are stored per-injection.'
          />
        </Panel>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Trace ${traceId ?? ''}`} />
        <Panel>
          <ErrorState
            title='Failed to load span tree'
            description={String(query.error ?? '')}
          />
        </Panel>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Trace ${traceId ?? ''}`} />
        <Panel>
          <EmptyState title='Loading…' />
        </Panel>
      </div>
    );
  }

  if (spans.length === 0) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Trace ${traceId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Trace not found'
            description='No spans in this datapack for the given trace id.'
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Trace ${traceId ?? ''}`}
        description={rootSpan?.name}
        action={<Chip tone='ghost'>{spans.length} spans</Chip>}
      />

      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'injection',
              v: <MonoValue size='sm'>{String(injectionId)}</MonoValue>,
            },
            {
              k: 'trace id',
              v: <MonoValue size='sm'>{traceId ?? '—'}</MonoValue>,
            },
            {
              k: 'root',
              v: <MonoValue size='sm'>{rootSpan?.name ?? '—'}</MonoValue>,
            },
          ]}
        />
      </Panel>

      <div className='page-overview-grid'>
        <MetricCard label='Duration' value={`${totalDuration.toFixed(0)} ms`} />
        <MetricCard label='Spans' value={spans.length} />
        <MetricCard
          label='Status'
          value={
            errorCount > 0 ? (
              <Chip tone='warning'>{errorCount} errors</Chip>
            ) : (
              <Chip tone='ink'>OK</Chip>
            )
          }
        />
        <MetricCard
          label='Root op'
          value={<MonoValue size='sm'>{rootSpan?.name ?? '—'}</MonoValue>}
        />
      </div>

      <SectionDivider>Span tree</SectionDivider>
      <Panel>
        <TraceTree spans={spans} defaultCollapsedDepth={3} />
      </Panel>
    </div>
  );
}
