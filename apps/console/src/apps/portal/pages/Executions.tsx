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
import { useActiveProjectId, useMockStore } from '../mocks';
import type { MockTask } from '../mocks/types';

export default function Executions() {
  const projectId = useActiveProjectId();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const tasks = useMockStore((s) =>
    s.tasks.filter((t) => t.kind === 'regression' || t.kind === 'eval'),
  );

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Executions'
        description={`Algorithm + eval executions for project ${projectId}.`}
        action={
          <Button
            tone='primary'
            onClick={() => navigate('executions/new')}
          >
            + Run algorithm
          </Button>
        }
      />
      <Panel>
        <DataTable<MockTask>
          data={tasks.slice(0, 30)}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Execution',
              render: (r) => (
                <Link to={href(`executions/${r.id}`)}>
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
