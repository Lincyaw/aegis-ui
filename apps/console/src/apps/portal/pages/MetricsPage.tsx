import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function MetricsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const injections = useMockStore((s) =>
    s.injections.filter((i) => !projectId || i.projectId === projectId),
  );

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of injections) {
      counts[i.status] = (counts[i.status] ?? 0) + 1;
    }
    return counts;
  }, [injections]);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Metrics'
        description={`Performance & reliability metrics for project ${projectId ?? ''}.`}
      />
      <div className='page-overview-grid'>
        <MetricCard label='Total injections' value={injections.length} />
        <MetricCard label='Completed' value={stats.completed ?? 0} />
        <MetricCard label='Running' value={stats.running ?? 0} />
        <MetricCard label='Failed' value={stats.failed ?? 0} />
      </div>
      <Panel title={<PanelTitle size='base'>Status distribution</PanelTitle>}>
        <pre style={{ fontFamily: 'var(--font-mono)' }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
