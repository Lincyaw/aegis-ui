import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Chip,
  DataTable,
  EmptyState,
  ErrorState,
  MetricCard,
  MonoValue,
  Panel,
  PanelTitle,
  TextField,
  TimeRangePicker,
} from '@lincyaw/aegis-ui';

import { useMetricsCatalog, useMetricsSeries } from '../hooks/observability';

interface SeriesRow {
  key: string;
  labels: string;
  points: number;
  last: string;
}

export default function MetricsPage() {
  const { injectionId: injectionIdParam } = useParams<{ injectionId: string }>();
  const injectionId =
    injectionIdParam !== undefined && /^\d+$/.test(injectionIdParam)
      ? Number(injectionIdParam)
      : null;

  const [metric, setMetric] = useState<string | null>(null);
  const [range, setRange] = useState('now-1h');
  const [step, setStep] = useState('30s');

  const catalog = useMetricsCatalog(injectionId);
  const metrics = catalog.data?.metrics ?? [];
  const selected = metric ?? metrics[0]?.name ?? null;

  const series = useMetricsSeries({
    injectionId,
    metric: selected,
    range,
    step: step.length > 0 ? step : undefined,
  });

  const rows = useMemo<SeriesRow[]>(() => {
    const list = series.data?.series ?? [];
    return list.map((s, idx) => {
      const lastPoint = s.points?.[s.points.length - 1];
      return {
        key: String(idx),
        labels: JSON.stringify(s.labels ?? {}),
        points: s.points?.length ?? 0,
        last: lastPoint?.value !== undefined ? String(lastPoint.value) : '—',
      };
    });
  }, [series.data]);

  if (injectionId === null) {
    return (
      <Panel>
        <EmptyState
          title='Open through an injection'
          description='Metrics are scoped to an injection — reach this view via /portal/injections/:id/metrics.'
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title={<PanelTitle size='base'>Scope</PanelTitle>}
        extra={<TimeRangePicker value={range} onChange={setRange} />}
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: '2fr 1fr',
          }}
        >
          <TextField
            label='Metric'
            value={selected ?? ''}
            placeholder='choose from catalog below'
            onChange={(e) => {
              setMetric(e.target.value);
            }}
          />
          <TextField
            label='Step'
            value={step}
            placeholder='e.g. 30s, 1m'
            onChange={(e) => {
              setStep(e.target.value);
            }}
          />
        </div>
      </Panel>

      <div className='page-overview-grid'>
        <MetricCard label='Metrics in catalog' value={metrics.length} />
        <MetricCard label='Series' value={rows.length} />
        <MetricCard
          label='Step'
          value={<MonoValue size='sm'>{series.data?.step ?? step}</MonoValue>}
        />
        <MetricCard label='Range' value={<Chip tone='ghost'>{range}</Chip>} />
      </div>

      <Panel title={<PanelTitle size='base'>Catalog</PanelTitle>}>
        {catalog.isError ? (
          <ErrorState
            title='Catalog load failed'
            description={String(catalog.error ?? '')}
          />
        ) : catalog.isLoading ? (
          <EmptyState title='Loading…' />
        ) : (
          <DataTable
            data={metrics.slice(0, 100)}
            rowKey={(r) => r.name ?? String(Math.random())}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r) => (
                  <button
                    type='button'
                    onClick={() => {
                      setMetric(r.name ?? null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: 'var(--accent-link)',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                  </button>
                ),
              },
              { key: 'unit', header: 'Unit', render: (r) => r.unit ?? '—' },
              {
                key: 'dims',
                header: 'Dimensions',
                render: (r) =>
                  (r.dimensions ?? []).length > 0
                    ? (r.dimensions ?? []).join(', ')
                    : '—',
              },
            ]}
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Series</PanelTitle>}>
        {selected === null ? (
          <EmptyState title='Pick a metric from the catalog' />
        ) : series.isError ? (
          <ErrorState
            title='Series load failed'
            description={String(series.error ?? '')}
          />
        ) : series.isLoading ? (
          <EmptyState title='Loading…' />
        ) : rows.length === 0 ? (
          <EmptyState title='No data in range' />
        ) : (
          <DataTable<SeriesRow>
            data={rows}
            rowKey={(r) => r.key}
            columns={[
              {
                key: 'labels',
                header: 'Labels',
                render: (r) => <MonoValue size='sm'>{r.labels}</MonoValue>,
              },
              {
                key: 'points',
                header: 'Points',
                render: (r) => <MonoValue size='sm'>{r.points}</MonoValue>,
              },
              {
                key: 'last',
                header: 'Last value',
                render: (r) => <MonoValue size='sm'>{r.last}</MonoValue>,
              },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
