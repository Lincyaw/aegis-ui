import { Link } from 'react-router-dom';

import {
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';

// TODO(portal-wire): no ContractsApi in @lincyaw/portal 1.3.0/1.4.0 — chaos contract specs are fixture-only; stays on mocks.
import { useMockStore } from '../mocks';
import type { MockContract } from '../mocks/types';

export default function Contracts() {
  const href = useAppHref();
  const contracts = useMockStore((s) => s.contracts);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Fault contracts'
        description='Reusable fault definitions parameterised by target.'
      />
      <Panel>
        <DataTable<MockContract>
          data={contracts}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`contracts/${r.id}`)}>
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'fault',
              header: 'Fault type',
              render: (r) => <Chip tone='ghost'>{r.faultType}</Chip>,
            },
            { key: 'family', header: 'Family', render: (r) => r.family },
            { key: 'target', header: 'Target', render: (r) => r.targetKind },
            {
              key: 'params',
              header: 'Params',
              render: (r) => <MonoValue size='sm'>{r.paramCount}</MonoValue>,
            },
            {
              key: 'lastUsed',
              header: 'Last used',
              render: (r) => <TimeDisplay value={r.lastUsedAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
