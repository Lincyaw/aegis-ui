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

import { useMockStore } from '../mocks';
import type { MockContainer } from '../mocks/types';

export default function Containers() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const containers = useMockStore((s) => s.containers);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Containers'
        description='RCA algorithm + benchmark container registry.'
        action={
          <Button tone='primary' onClick={() => navigate('containers/new')}>
            + Register container
          </Button>
        }
      />
      <Panel>
        <DataTable<MockContainer>
          data={containers}
          rowKey={(r) => r.id}
          emptyTitle='No containers'
          emptyDescription='Register one to enable algo tasks.'
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`containers/${r.id}`)}>
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </Link>
              ),
            },
            { key: 'image', header: 'Image', render: (r) => <MonoValue size='sm'>{r.image}</MonoValue> },
            { key: 'algo', header: 'Algorithm', render: (r) => r.algorithm },
            { key: 'created', header: 'Created', render: (r) => <TimeDisplay value={r.createdAt} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
