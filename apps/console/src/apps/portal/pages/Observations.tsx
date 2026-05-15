import {
  Chip,
  KeyValueList,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useActiveProjectId, useMockStore } from '../mocks';

export default function Observations() {
  const projectId = useActiveProjectId();
  const traces = useMockStore((s) =>
    s.traces.filter((t) => t.projectId === projectId),
  );

  const totalSpans = traces.reduce((sum, t) => sum + t.spanCount, 0);
  const avgDuration =
    traces.length === 0
      ? 0
      : Math.round(traces.reduce((sum, t) => sum + t.durationMs, 0) / traces.length);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Observations'
        description={`OTel signal sources for project ${projectId}.`}
      />

      <div className='page-overview-grid'>
        <MetricCard label='Traces' value={traces.length} />
        <MetricCard label='Total spans' value={totalSpans} />
        <MetricCard label='Avg duration' value={`${avgDuration} ms`} />
        <MetricCard label='Collector' value={<Chip tone='ink'>OK</Chip>} />
      </div>

      <Panel title={<PanelTitle size='base'>Configured sources</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'otel collector', v: 'otel-kube-stack/otlp:4317' },
            { k: 'clickhouse', v: 'rcabench-clickhouse:9000' },
            { k: 'metrics scraper', v: 'prom-stack/prometheus:9090' },
          ]}
        />
      </Panel>
    </div>
  );
}
