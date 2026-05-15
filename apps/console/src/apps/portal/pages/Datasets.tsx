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
import type { MockDataset } from '../mocks/types';

export default function Datasets() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const datasets = useMockStore((s) => s.datasets);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Datasets'
        description='Curated bundles of injections + traces for replay & eval.'
        action={
          <Button tone='primary' onClick={() => navigate('datasets/new')}>
            + New dataset
          </Button>
        }
      />
      <Panel>
        <DataTable<MockDataset>
          data={datasets}
          rowKey={(r) => r.id}
          emptyTitle='No datasets'
          emptyDescription='Build a dataset from the Injections list.'
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`datasets/${r.id}`)}>
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </Link>
              ),
            },
            { key: 'desc', header: 'Description', render: (r) => r.description },
            {
              key: 'inj',
              header: 'Injections',
              render: (r) => <MonoValue size='sm'>{r.injectionIds.length}</MonoValue>,
            },
            {
              key: 'size',
              header: 'Size',
              render: (r) => <MonoValue size='sm'>{r.sizeMb} MB</MonoValue>,
            },
            {
              key: 'created',
              header: 'Created',
              render: (r) => <TimeDisplay value={r.createdAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
