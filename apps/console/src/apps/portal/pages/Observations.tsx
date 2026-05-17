import { useParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  ErrorState,
  KeyValueList,
  MetricCard,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useMetricsCatalog, useServiceMap } from '../hooks/observability';

export default function Observations() {
  const { injectionId: injectionIdParam } = useParams<{ injectionId: string }>();
  const injectionId =
    injectionIdParam !== undefined && /^\d+$/.test(injectionIdParam)
      ? Number(injectionIdParam)
      : null;

  const catalog = useMetricsCatalog(injectionId);
  const serviceMap = useServiceMap(injectionId, 'fault');

  const metrics = catalog.data?.metrics ?? [];
  const nodes = serviceMap.data?.nodes ?? [];
  const edges = serviceMap.data?.edges ?? [];
  const totalErrors = nodes.reduce(
    (sum, n) => sum + Math.round((n.error_rate ?? 0) * (n.span_count ?? 0)),
    0,
  );

  if (injectionId === null) {
    return (
      <Panel>
        <EmptyState
          title='Open through an injection'
          description='Observations are scoped to an injection — reach this view via /portal/injections/:id/observations.'
        />
      </Panel>
    );
  }

  if (catalog.isError || serviceMap.isError) {
    return (
      <Panel>
        <ErrorState
          title='Failed to load observations'
          description={String(catalog.error ?? serviceMap.error ?? '')}
        />
      </Panel>
    );
  }

  return (
    <>
      <div className='page-overview-grid'>
        <MetricCard label='Metrics available' value={metrics.length} />
        <MetricCard label='Services' value={nodes.length} />
        <MetricCard label='Edges' value={edges.length} />
        <MetricCard
          label='Errors (est.)'
          value={
            totalErrors > 0 ? (
              <Chip tone='warning'>{totalErrors}</Chip>
            ) : (
              <Chip tone='ink'>OK</Chip>
            )
          }
        />
      </div>

      <Panel title={<PanelTitle size='base'>Metrics catalog</PanelTitle>}>
        {catalog.isLoading ? (
          <EmptyState title='Loading…' />
        ) : metrics.length === 0 ? (
          <EmptyState
            title='No metrics indexed'
            description='Datapack ingestion may still be in progress.'
          />
        ) : (
          <KeyValueList
            items={metrics.slice(0, 20).map((m) => ({
              k: m.name ?? '—',
              v: (
                <MonoValue size='sm'>
                  {m.unit ?? '—'}
                  {(m.dimensions ?? []).length > 0
                    ? `  [${(m.dimensions ?? []).join(', ')}]`
                    : ''}
                </MonoValue>
              ),
            }))}
          />
        )}
      </Panel>
    </>
  );
}
