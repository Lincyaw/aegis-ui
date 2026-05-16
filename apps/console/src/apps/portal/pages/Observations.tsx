import { useSearchParams } from 'react-router-dom';

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
  TextField,
} from '@lincyaw/aegis-ui';

import { useMetricsCatalog, useServiceMap } from '../hooks/observability';

export default function Observations() {
  const [params, setParams] = useSearchParams();
  const injectionParam = params.get('injection');
  const injectionId =
    injectionParam !== null && /^\d+$/.test(injectionParam)
      ? Number(injectionParam)
      : null;

  const catalog = useMetricsCatalog(injectionId);
  const serviceMap = useServiceMap(injectionId, 'fault');

  const metrics = catalog.data?.metrics ?? [];
  const nodes = serviceMap.data?.nodes ?? [];
  const edges = serviceMap.data?.edges ?? [];
  const totalErrors = nodes.reduce(
    (sum, n) => sum + Math.round((n.error_rate ?? 0) * (n.span_count ?? 0)),
    0
  );

  const updateInjection = (value: string): void => {
    const next = new URLSearchParams(params);
    if (value.length === 0) {
      next.delete('injection');
    } else {
      next.set('injection', value);
    }
    setParams(next, { replace: true });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Observations'
        description='OTel signal sources for the selected injection.'
        action={
          <TextField
            label='Injection ID'
            value={injectionParam ?? ''}
            placeholder='e.g. 42'
            onChange={(e) => {
              updateInjection(e.target.value);
            }}
          />
        }
      />

      {injectionId === null ? (
        <Panel>
          <EmptyState
            title='Pick an injection'
            description='Observation signals are scoped to an injection datapack. Append ?injection=<id> or use the input above.'
          />
        </Panel>
      ) : catalog.isError || serviceMap.isError ? (
        <Panel>
          <ErrorState
            title='Failed to load observations'
            description={String(catalog.error ?? serviceMap.error ?? '')}
          />
        </Panel>
      ) : (
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
      )}
    </div>
  );
}
