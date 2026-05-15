import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockPedestal } from '../mocks/types';

export default function Pedestals() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const pedestals = useMockStore((s) => s.pedestals);

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
        <DataTable<MockPedestal>
          data={pedestals}
          rowKey={(r) => r.id}
          emptyTitle='No pedestals'
          emptyDescription='Install one to begin injecting faults.'
          columns={[
            {
              key: 'ns',
              header: 'Namespace',
              render: (r) => (
                <Link to={href(`pedestals/${r.id}`)}>
                  <MonoValue size='sm'>{r.namespace}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'system',
              header: 'System',
              render: (r) => <Link to={href(`systems/${r.systemCode}`)}>{r.systemCode}</Link>,
            },
            {
              key: 'version',
              header: 'Version',
              render: (r) => <MonoValue size='sm'>{r.version}</MonoValue>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip status={r.status} />,
            },
            { key: 'age', header: 'Age', render: (r) => r.age },
            {
              key: 'last',
              header: 'Last restart',
              render: (r) => <TimeDisplay value={r.lastRestartAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
