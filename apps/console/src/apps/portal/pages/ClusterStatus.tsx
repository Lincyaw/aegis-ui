import {
  Button,
  Chip,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
} from '@lincyaw/aegis-ui';

export default function ClusterStatus() {
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Cluster status'
        description='Control-plane preflight checks.'
        action={<Button tone='primary'>Run preflight</Button>}
      />

      <div className='page-overview-grid'>
        <MetricCard label='K8s API' value={<Chip tone='ink'>OK</Chip>} />
        <MetricCard label='Redis' value={<Chip tone='ink'>OK</Chip>} />
        <MetricCard label='MySQL' value={<Chip tone='ink'>OK</Chip>} />
        <MetricCard label='etcd' value={<Chip tone='ink'>OK</Chip>} />
        <MetricCard label='ClickHouse' value={<Chip tone='ink'>OK</Chip>} />
        <MetricCard label='OTel collector' value={<Chip tone='warning'>degraded</Chip>} />
      </div>

      <Panel title={<PanelTitle size='base'>Recent events</PanelTitle>}>
        <Terminal
          lines={[
            { ts: '10:01:02', level: 'info', body: 'preflight check started' },
            { ts: '10:01:03', level: 'info', body: 'kube-api reachable (latency 12ms)' },
            { ts: '10:01:04', level: 'info', body: 'redis ping ok' },
            { ts: '10:01:05', level: 'info', body: 'mysql connection pool healthy' },
            { ts: '10:01:06', level: 'info', body: 'etcd quorum: 3/3' },
            { ts: '10:01:07', level: 'info', body: 'clickhouse insert ok' },
            { ts: '10:01:08', level: 'warn', body: 'otel-collector queue depth 1280 (warn threshold 1000)' },
          ]}
        />
      </Panel>
    </div>
  );
}
