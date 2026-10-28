import {
  Chip,
  DataTable,
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';
import {
  type ClusterClusterCheck,
  ClusterClusterCheckStatus,
} from '@lincyaw/portal';
import { Spin } from 'antd';

import { useClusterStatus } from '../api/cluster';

type BadgeStatus = 'ok' | 'warn' | 'fail';

function normalizeStatus(
  status: ClusterClusterCheckStatus | string | undefined
): BadgeStatus {
  if (status === ClusterClusterCheckStatus.OK) {
    return 'ok';
  }
  if (status === ClusterClusterCheckStatus.Fail) {
    return 'fail';
  }
  return 'warn';
}

function normalizeDetail(check: ClusterClusterCheck): string {
  if (check.status === ClusterClusterCheckStatus.Unknown) {
    return check.detail && check.detail.length > 0
      ? check.detail
      : 'indeterminate';
  }
  return check.detail ?? '';
}

function statusChip(status: BadgeStatus) {
  if (status === 'ok') {
    return <Chip tone='ink'>OK</Chip>;
  }
  if (status === 'fail') {
    return <Chip tone='warning'>fail</Chip>;
  }
  return <Chip tone='warning'>degraded</Chip>;
}

export default function ClusterStatus() {
  const { data, isLoading } = useClusterStatus();
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

  const failing = checks.filter((c) => normalizeStatus(c.status) !== 'ok');

  return (
    <>
      <PageHeader
        title='Cluster status'
        description='Control-plane preflight checks.'
      />

      {isLoading && checks.length === 0 ? (
        <Panel>
          <Spin />
        </Panel>
      ) : (
        <div className='page-overview-grid'>
          {checks.map((c) => (
            <MetricCard
              key={c.id ?? c.name}
              label={c.name ?? c.id ?? 'check'}
              value={statusChip(normalizeStatus(c.status))}
            />
          ))}
        </div>
      )}

      <Panel title={<PanelTitle size='base'>Failing checks</PanelTitle>}>
        {failing.length === 0 ? (
          <Chip tone='ink'>All checks green</Chip>
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
                render: (c) => normalizeDetail(c),
              },
            ]}
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Recent events</PanelTitle>}>
        {lines.length === 0 ? (
          <EmptyState
            title='No recent events'
            description='No recent events available.'
          />
        ) : (
          <Terminal lines={lines} />
        )}
      </Panel>
    </>
  );
}
