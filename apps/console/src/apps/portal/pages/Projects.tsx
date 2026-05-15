import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockProject } from '../mocks/types';

export default function Projects() {
  const navigate = useAppNavigate();
  const projects = useMockStore((s) => s.projects);
  const setActiveProject = useMockStore((s) => s.setActiveProject);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Projects'
        description='Manage fault-injection projects and their associated resources.'
        action={
          <Button tone='primary' onClick={() => navigate('projects/new')}>
            + New project
          </Button>
        }
      />
      <Panel>
        <DataTable<MockProject>
          data={projects}
          rowKey={(r) => r.id}
          emptyTitle='No projects'
          emptyDescription='Create a project to start.'
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <a
                  href='#'
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveProject(r.id);
                    navigate(`projects/${r.id}`);
                  }}
                >
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </a>
              ),
            },
            { key: 'desc', header: 'Description', render: (r) => r.description },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip status={r.status} />,
            },
            {
              key: 'inj',
              header: 'Injections',
              render: (r) => <MonoValue size='sm'>{r.injectionCount}</MonoValue>,
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
