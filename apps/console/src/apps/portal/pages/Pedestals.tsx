import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

interface PedestalRow {
  id: string;
  namespace: string;
  system: string;
  version: string;
  status: 'Running' | 'Pending' | 'Failed';
  age: string;
  lastRestart: string;
}

const PEDESTALS: PedestalRow[] = [
  { id: 'ped-001', namespace: 'ts-1', system: 'ts', version: 'v1.4.2', status: 'Running', age: '3d', lastRestart: '2026-05-12T08:00:00Z' },
  { id: 'ped-002', namespace: 'ts-2', system: 'ts', version: 'v1.4.2', status: 'Running', age: '3d', lastRestart: '2026-05-12T08:00:00Z' },
  { id: 'ped-003', namespace: 'hs-1', system: 'hs', version: 'v0.9.1', status: 'Running', age: '5h', lastRestart: '2026-05-15T05:00:00Z' },
  { id: 'ped-004', namespace: 'otel-demo-1', system: 'otel-demo', version: 'v1.10.0', status: 'Pending', age: '2m', lastRestart: '2026-05-15T10:00:00Z' },
];

export default function Pedestals() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Pedestals'
        description='Deployed benchmark instances per system + namespace.'
        action={
          <Button tone='primary' onClick={() => navigate('pedestals/new')}>
            + Install pedestal
          </Button>
        }
      />
      <Panel>
        <DataTable<PedestalRow>
          data={PEDESTALS}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'ns',
              header: 'Namespace',
              render: (r) => <Link to={href(`pedestals/${r.id}`)}><MonoValue size='sm'>{r.namespace}</MonoValue></Link>,
            },
            {
              key: 'system',
              header: 'System',
              render: (r) => <Link to={href(`systems/${r.system}`)}>{r.system}</Link>,
            },
            { key: 'version', header: 'Version', render: (r) => <MonoValue size='sm'>{r.version}</MonoValue> },
            { key: 'status', header: 'Status', render: (r) => <Chip tone={r.status === 'Running' ? 'ink' : r.status === 'Failed' ? 'warning' : 'ghost'}>{r.status}</Chip> },
            { key: 'age', header: 'Age', render: (r) => r.age },
            { key: 'restart', header: 'Last restart', render: (r) => <TimeDisplay value={r.lastRestart} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
