import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';
import type { MockLabel } from '../mocks/types';

export default function Labels() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const labels = useMockStore((s) => s.labels);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Labels'
        description='Organize and filter resources with custom labels.'
        action={
          <Button tone='primary' onClick={() => navigate('labels/new')}>
            + New label
          </Button>
        }
      />
      <Panel>
        <DataTable<MockLabel>
          data={labels}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`labels/${r.id}`)}>
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'color',
              header: 'Color',
              render: (r) => (
                <Chip
                  tone={
                    r.color === 'warning'
                      ? 'warning'
                      : r.color === 'ink'
                        ? 'ink'
                        : 'ghost'
                  }
                >
                  {r.color}
                </Chip>
              ),
            },
            {
              key: 'count',
              header: 'Uses',
              render: (r) => <MonoValue size='sm'>{r.count}</MonoValue>,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
