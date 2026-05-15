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

interface ContractRow {
  id: string;
  name: string;
  faultType: string;
  targetKind: string;
  paramCount: number;
  lastUsed: string;
}

const CONTRACTS: ContractRow[] = [
  { id: 'ctr-pod-failure', name: 'pod-failure', faultType: 'pod', targetKind: 'Pod', paramCount: 3, lastUsed: '2026-05-15T09:42Z' },
  { id: 'ctr-net-delay', name: 'network-delay', faultType: 'network', targetKind: 'Service', paramCount: 5, lastUsed: '2026-05-15T08:11Z' },
  { id: 'ctr-jvm-cpu', name: 'jvm-cpu-burn', faultType: 'jvm', targetKind: 'Pod', paramCount: 2, lastUsed: '2026-05-14T22:01Z' },
  { id: 'ctr-http-abort', name: 'http-abort', faultType: 'http', targetKind: 'Ingress', paramCount: 4, lastUsed: '2026-05-13T14:20Z' },
  { id: 'ctr-stress-mem', name: 'stress-memory', faultType: 'stress', targetKind: 'Pod', paramCount: 2, lastUsed: '2026-05-10T11:30Z' },
];

export default function Contracts() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Fault contracts'
        description='Reusable fault definitions parameterised by target.'
        action={
          <Button tone='primary' onClick={() => navigate('contracts/new')}>
            + New contract
          </Button>
        }
      />
      <Panel>
        <DataTable<ContractRow>
          data={CONTRACTS}
          rowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <Link to={href(`contracts/${r.id}`)}><MonoValue size='sm'>{r.name}</MonoValue></Link> },
            { key: 'faultType', header: 'Fault type', render: (r) => <Chip tone='ghost'>{r.faultType}</Chip> },
            { key: 'targetKind', header: 'Target kind', render: (r) => r.targetKind },
            { key: 'params', header: 'Params', render: (r) => <MonoValue size='sm'>{r.paramCount}</MonoValue> },
            { key: 'lastUsed', header: 'Last used', render: (r) => <TimeDisplay value={r.lastUsed} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
