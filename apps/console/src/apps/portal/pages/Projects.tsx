import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { ProjectProjectResp } from '@lincyaw/portal';

import { StatusChip } from '../components/StatusChip';
import { useActiveProjectStore } from '../hooks/useActiveProject';
import { useProjectsList } from '../hooks/useProjects';

export default function Projects() {
  const navigate = useAppNavigate();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const {
    data: projects,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectsList();

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
        {isError ? (
          <ErrorState
            title='Failed to load projects'
            description={error.message}
            action={
              <Button tone='secondary' onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable<ProjectProjectResp>
            data={projects ?? []}
            rowKey={(r) => String(r.id ?? '')}
            loading={isLoading}
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
                      if (r.id !== undefined) {
                        setActiveProject(r.id);
                        navigate(`projects/${String(r.id)}`);
                      }
                    }}
                  >
                    <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                  </a>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                render: (r) =>
                  r.description !== undefined && r.description.length > 0
                    ? r.description
                    : '—',
              },
              {
                key: 'visibility',
                header: 'Visibility',
                render: (r) => (r.is_public ? 'public' : 'private'),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <StatusChip status={r.status ?? 'unknown'} />,
              },
              {
                key: 'inj',
                header: 'Injections',
                render: (r) => (
                  <MonoValue size='sm'>{r.injection_count ?? 0}</MonoValue>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) =>
                  r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
              },
            ]}
          />
        )}
        {!isError && !isLoading && (projects?.length ?? 0) === 0 && (
          <EmptyState
            title='No projects yet'
            description='Click “+ New project” to create one.'
          />
        )}
      </Panel>
    </div>
  );
}
