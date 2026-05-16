import { App as AntdApp } from 'antd';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  DataList,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  StatusDot,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
// TODO(portal-wire): no SystemsApi in @lincyaw/portal 1.3.0/1.4.0 — pages stay on mocks until backend exposes /system/chaossystem CRUD.
import { useMockStore } from '../mocks';
import type { MockInjection, MockPedestal } from '../mocks/types';

export default function SystemDetail() {
  const { code } = useParams<{ code: string }>();
  const href = useAppHref();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const system = useMockStore((s) => s.systems.find((x) => x.code === code));
  const pedestals = useMockStore((s) => s.pedestals.filter((p) => p.systemCode === code));
  const recent = useMockStore((s) =>
    s.injections.filter((i) => i.systemCode === code).slice(0, 8),
  );
  const enableSystem = useMockStore((s) => s.enableSystem);
  const disableSystem = useMockStore((s) => s.disableSystem);

  if (!system) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='System not found' />
        <Panel>
          <EmptyState title='Not found' description='No such system code.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={system.name}
        description={system.description}
        action={
          <div className='page-action-row'>
            <Button
              tone='primary'
              onClick={() => navigate(`injections/new?system=${system.code}`)}
            >
              Inject fault
            </Button>
            {system.enabled ? (
              <Button
                tone='secondary'
                onClick={() => {
                  disableSystem(system.code);
                  void msg.success(`Disabled ${system.code}`);
                }}
              >
                Disable
              </Button>
            ) : (
              <Button
                tone='secondary'
                onClick={() => {
                  enableSystem(system.code);
                  void msg.success(`Enabled ${system.code}`);
                }}
              >
                Enable
              </Button>
            )}
            <Button
              tone='secondary'
              onClick={() => navigate(`pedestals/new?system=${system.code}`)}
            >
              Install pedestal
            </Button>
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Overview</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'short code', v: <MonoValue size='sm'>{system.code}</MonoValue> },
            { k: 'chart', v: <MonoValue size='sm'>{system.chart}</MonoValue> },
            { k: 'version', v: <MonoValue size='sm'>{system.version}</MonoValue> },
            { k: 'otel sink', v: <MonoValue size='sm'>{system.otelEndpoint}</MonoValue> },
            {
              k: 'enabled',
              v: (
                <StatusDot
                  size={6}
                  tone={system.enabled ? 'ink' : 'muted'}
                />
              ),
            },
          ]}
        />
      </Panel>

      <div className='page-overview-grid'>
        <MetricCard label='Pedestals' value={pedestals.length} />
        <MetricCard label='Recent injections' value={recent.length} />
        <MetricCard label='Status' value={system.enabled ? 'active' : 'disabled'} />
        <MetricCard label='Version' value={system.version} />
      </div>

      <SectionDivider>Pedestals</SectionDivider>
      <Panel>
        {pedestals.length === 0 ? (
          <EmptyState
            title='No pedestals deployed'
            description='Install one to begin injecting faults.'
          />
        ) : (
          <DataList<MockPedestal>
            items={pedestals}
            columns={[
              {
                key: 'ns',
                label: 'Namespace',
                render: (r) => <Link to={href(`pedestals/${r.id}`)}>{r.namespace}</Link>,
              },
              { key: 'version', label: 'Version', render: (r) => r.version },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <StatusChip status={r.status} />,
              },
            ]}
          />
        )}
      </Panel>

      <SectionDivider>Recent injections</SectionDivider>
      <Panel>
        {recent.length === 0 ? (
          <EmptyState title='No recent injections' description='Inject a fault to populate.' />
        ) : (
          <DataList<MockInjection>
            items={recent}
            columns={[
              {
                key: 'id',
                label: 'Injection',
                render: (r) => (
                  <Link to={href(`injections/${r.id}`)}>{r.id}</Link>
                ),
              },
              { key: 'name', label: 'Fault', render: (r) => r.name },
              { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
            ]}
          />
        )}
      </Panel>

      <SectionDivider>Prereqs</SectionDivider>
      <Panel>
        <KeyValueList
          items={system.prereqs.map((p) => ({
            k: p.name,
            v: p.ok ? (
              <Chip tone='ink'>OK</Chip>
            ) : (
              <Chip tone='warning'>{p.note ?? 'failing'}</Chip>
            ),
          }))}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Helm values (pinned)</PanelTitle>}>
        <CodeBlock
          language='yaml'
          code={`image:\n  repository: pair-cn-shanghai.cr.volces.com/opspai/${system.code}\n  tag: ${system.version}\notel:\n  endpoint: ${system.otelEndpoint}\n`}
        />
      </Panel>
    </div>
  );
}
