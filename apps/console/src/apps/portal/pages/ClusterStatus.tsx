import { App as AntdApp } from 'antd';

import {
  Button,
  Chip,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

function statusChip(status: string) {
  if (status === 'ok') {
    return <Chip tone='ink'>OK</Chip>;
  }
  if (status === 'warn') {
    return <Chip tone='warning'>degraded</Chip>;
  }
  if (status === 'fail') {
    return <Chip tone='warning'>fail</Chip>;
  }
  return <Chip tone='ghost'>checking…</Chip>;
}

export default function ClusterStatus() {
  const { message: msg } = AntdApp.useApp();
  const checks = useMockStore((s) => s.clusterChecks);
  const events = useMockStore((s) => s.clusterEvents);
  const runPreflight = useMockStore((s) => s.runPreflight);
  const appendClusterEvent = useMockStore((s) => s.appendClusterEvent);

  const lines: TerminalLine[] = events.map((e) => ({
    ts: e.ts,
    level: e.level,
    body: e.body,
  }));

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Cluster status'
        description='Control-plane preflight checks.'
        action={
          <Button
            tone='primary'
            onClick={() => {
              runPreflight();
              void msg.success('Preflight running');
            }}
          >
            Run preflight
          </Button>
        }
      />

      <div className='page-overview-grid'>
        {checks.map((c) => (
          <MetricCard key={c.id} label={c.name} value={statusChip(c.status)} />
        ))}
      </div>

      <Panel title={<PanelTitle size='base'>Failing checks</PanelTitle>}>
        {checks.filter((c) => c.status === 'warn' || c.status === 'fail').length === 0 ? (
          <Chip tone='ink'>All checks green</Chip>
        ) : (
          <div className='page-table'>
            <div className='page-table__head'>
              <span className='page-table__cell'>Check</span>
              <span className='page-table__cell'>Detail</span>
              <span className='page-table__cell'>Action</span>
            </div>
            {checks
              .filter((c) => c.status === 'warn' || c.status === 'fail')
              .map((c) => (
                <div key={c.id} className='page-table__row'>
                  <span className='page-table__cell'>{c.name}</span>
                  <span className='page-table__cell'>{c.detail}</span>
                  <span className='page-table__cell'>
                    {c.action ? (
                      <Button
                        tone='secondary'
                        onClick={() => {
                          const label = c.action?.label ?? 'action';
                          appendClusterEvent('info', `${label} clicked for ${c.name}`);
                          void msg.success(`${label} triggered`);
                        }}
                      >
                        {c.action.label}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Recent events</PanelTitle>}>
        <Terminal lines={lines} />
      </Panel>
    </div>
  );
}
