import { Link } from 'react-router-dom';

import {
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockTask } from '../mocks/types';

export default function Tasks() {
  const href = useAppHref();
  const tasks = useMockStore((s) => s.tasks);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Tasks'
        description='Background jobs across injections, regressions, and evals.'
      />
      <Panel>
        <DataTable<MockTask>
          data={tasks.slice(0, 60)}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Task',
              render: (r) => (
                <Link to={href(`tasks/${r.id}`)}>
                  <MonoValue size='sm'>{r.id}</MonoValue>
                </Link>
              ),
            },
            { key: 'kind', header: 'Kind', render: (r) => r.kind },
            {
              key: 'parent',
              header: 'Parent',
              render: (r) => <MonoValue size='sm'>{r.parentLabel}</MonoValue>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip status={r.status} />,
            },
            {
              key: 'started',
              header: 'Started',
              render: (r) => <TimeDisplay value={r.startedAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
