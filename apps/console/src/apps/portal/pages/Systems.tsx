import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  StatusDot,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

// TODO(portal-wire): no SystemsApi in @lincyaw/portal 1.3.0/1.4.0 — pages stay on mocks until backend exposes /system/chaossystem CRUD.
import { useMockStore } from '../mocks';
import type { MockSystem } from '../mocks/types';

export default function Systems() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const systems = useMockStore((s) => s.systems);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Systems'
        description='Benchmark systems registered with the aegis control plane.'
        action={
          <Button tone='primary' onClick={() => navigate('systems/new')}>
            + Register system
          </Button>
        }
      />
      <Panel>
        <DataTable<MockSystem>
          data={systems}
          rowKey={(r) => r.code}
          emptyTitle='No systems'
          emptyDescription='Register a benchmark to begin.'
          columns={[
            {
              key: 'code',
              header: 'Code',
              render: (r) => (
                <Link to={href(`systems/${r.code}`)}>
                  <MonoValue size='sm'>{r.code}</MonoValue>
                </Link>
              ),
            },
            { key: 'name', header: 'Name', render: (r) => r.name },
            {
              key: 'enabled',
              header: 'Status',
              render: (r) => (
                <Chip tone={r.enabled ? 'ink' : 'ghost'}>
                  <StatusDot size={6} tone={r.enabled ? 'ink' : 'muted'} />{' '}
                  {r.enabled ? 'Enabled' : 'Disabled'}
                </Chip>
              ),
            },
            {
              key: 'pedestals',
              header: 'Pedestals',
              render: (r) => <MonoValue size='sm'>{r.pedestalCount}</MonoValue>,
            },
            {
              key: 'last',
              header: 'Last injection',
              render: (r) => <TimeDisplay value={r.lastInjectionAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
