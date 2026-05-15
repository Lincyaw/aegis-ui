import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  DataList,
  KeyValueList,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  StatusDot,
  useAppHref,
} from '@lincyaw/aegis-ui';

interface Pedestal {
  id: string;
  namespace: string;
  version: string;
  status: 'Running' | 'Pending' | 'Failed';
}

const PEDESTALS: Pedestal[] = [
  { id: 'ped-001', namespace: 'ts-1', version: 'v1.4.2', status: 'Running' },
  { id: 'ped-002', namespace: 'ts-2', version: 'v1.4.2', status: 'Running' },
];

interface Inj {
  id: string;
  fault: string;
  target: string;
  startedAt: string;
}

const RECENT: Inj[] = [
  { id: 'inj-9921', fault: 'pod-failure', target: 'ts-travel-service', startedAt: '2026-05-15T09:42Z' },
  { id: 'inj-9920', fault: 'network-delay', target: 'ts-order-service', startedAt: '2026-05-15T08:11Z' },
];

export default function SystemDetail() {
  const { code } = useParams<{ code: string }>();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`System ${code ?? ''}`}
        description='Benchmark system overview, pedestals, and prereqs.'
        action={
          <>
            <Button tone='secondary'>Disable</Button>{' '}
            <Button tone='secondary'>Publish chart</Button>
          </>
        }
      />

      <Panel title={<PanelTitle size='base'>Overview</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'chart', v: `oci://opspai/benchmarks/${code ?? ''}` },
            { k: 'version', v: 'v1.4.2' },
            { k: 'otel sink', v: 'otel-kube-stack/otlp:4317' },
            { k: 'enabled', v: <StatusDot size={6} tone='ink' /> },
          ]}
        />
      </Panel>

      <SectionDivider>Pedestals</SectionDivider>
      <Panel>
        <DataList<Pedestal>
          items={PEDESTALS}
          columns={[
            {
              key: 'ns',
              label: 'Namespace',
              render: (r) => <Link to={href(`pedestals/${r.id}`)}>{r.namespace}</Link>,
            },
            { key: 'version', label: 'Version', render: (r) => r.version },
            { key: 'status', label: 'Status', render: (r) => <Chip tone='ink'>{r.status}</Chip> },
          ]}
        />
      </Panel>

      <SectionDivider>Recent injections</SectionDivider>
      <Panel>
        <DataList<Inj>
          items={RECENT}
          columns={[
            {
              key: 'id',
              label: 'Injection',
              render: (r) => <Link to={href(`projects/default/injections/${r.id}`)}>{r.id}</Link>,
            },
            { key: 'fault', label: 'Fault', render: (r) => r.fault },
            { key: 'target', label: 'Target', render: (r) => r.target },
            { key: 'startedAt', label: 'Started', render: (r) => r.startedAt },
          ]}
        />
      </Panel>

      <SectionDivider>Prereqs</SectionDivider>
      <Panel>
        <KeyValueList
          items={[
            { k: 'helm chart published', v: <Chip tone='ink'>OK</Chip> },
            { k: 'otel collector reachable', v: <Chip tone='ink'>OK</Chip> },
            { k: 'db seed applied', v: <Chip tone='ink'>OK</Chip> },
            { k: 'sidecar image mirrored', v: <Chip tone='warning'>volces only</Chip> },
          ]}
        />
      </Panel>

      <div className='page-overview-grid'>
        <MetricCard label='Injections (7d)' value={142} />
        <MetricCard label='Pedestals' value={PEDESTALS.length} />
        <MetricCard label='Datasets' value={9} />
        <MetricCard label='Success rate' value='98.6%' />
      </div>

      <Panel title={<PanelTitle size='base'>Helm values (pinned)</PanelTitle>}>
        <CodeBlock
          language='yaml'
          code={`image:\n  repository: pair-cn-shanghai.cr.volces.com/opspai/${code ?? ''}\n  tag: v1.4.2\notel:\n  endpoint: http://otel-collector:4317\n`}
        />
      </Panel>
    </div>
  );
}
