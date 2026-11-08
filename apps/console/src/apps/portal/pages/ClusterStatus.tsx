import {
  Chip,
  DataTable,
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  SkeletonText,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';
import {
  type ClusterClusterCheck,
  ClusterClusterCheckStatus,
} from '@lincyaw/portal';

import { useClusterStatus } from '../api/cluster';
import { LoadError } from '../components/LoadError';
import { StatusChip } from '../components/StatusChip';

function detailFor(check: ClusterClusterCheck): string {
  if (check.status === ClusterClusterCheckStatus.Unknown && !check.detail) {
    return 'indeterminate';
  }
  return check.detail ?? '';
}

export default function ClusterStatus() {
  const { data, isLoading, isError, error } = useClusterStatus();
  const checks = data?.checks ?? [];
  const events = data?.events ?? [];

  const lines: TerminalLine[] = events.map((e) => ({
    ts: e.ts,
    level:
      e.level === 'debug' ||
      e.level === 'info' ||
      e.level === 'warn' ||
      e.level === 'error'
        ? e.level
        : undefined,
    body: e.body ?? '',
  }));

  const failing = checks.filter(
    (c) => c.status !== ClusterClusterCheckStatus.OK
  );

  const header = (
    <PageHeader
      title='Cluster status'
      description='Control-plane preflight checks.'
    />
  );

  if (isLoading || isError) {
    return (
      <>
        {header}
        <Panel>
          {isError ? (
            <LoadError error={error} title='Failed to load cluster status' />
          ) : (
            <SkeletonText />
          )}
        </Panel>
      </>
    );
  }

  return (
    <>
      {header}

      {checks.length > 0 && (
        <div className='page-overview-grid'>
          {checks.map((c) => (
            <MetricCard
              key={c.id ?? c.name}
              label={c.name ?? c.id ?? 'check'}
              value={<StatusChip status={c.status} />}
            />
          ))}
        </div>
      )}

      <Panel title={<PanelTitle size='base'>Failing checks</PanelTitle>}>
        {checks.length === 0 ? (
          <EmptyState
            title='No checks reported'
            description='The control plane returned no preflight checks.'
          />
        ) : failing.length === 0 ? (
          <Chip tone='success'>All checks pass</Chip>
        ) : (
          <DataTable<ClusterClusterCheck>
            framed={false}
            data={failing}
            rowKey={(c) => c.id ?? c.name ?? ''}
            columns={[
              {
                key: 'check',
                header: 'Check',
                render: (c) => c.name ?? c.id,
              },
              {
                key: 'detail',
                header: 'Detail',
                truncate: false,
                render: (c) => detailFor(c),
              },
            ]}
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Recent events</PanelTitle>}>
        {lines.length === 0 ? (
          <EmptyState
            title='No recent events'
            description='The control plane has not reported any events.'
          />
        ) : (
          <Terminal lines={lines} />
        )}
      </Panel>
    </>
  );
}
