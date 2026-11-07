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
import type { ProjectProjectResp } from '@lincyaw/portal';

import { useProjectsList } from '../api/projects';
import { LoadError } from '../components/LoadError';
import { StatusChip } from '../components/StatusChip';
import { useActiveProjectStore } from '../state/active-project';

export default function Projects() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const { data, isLoading, isError, error } = useProjectsList();

  return (
    <>
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
          <LoadError error={error} title='Failed to load projects' />
        ) : (
          <DataTable<ProjectProjectResp>
            framed={false}
            data={data?.items ?? []}
            rowKey={(r) => String(r.id ?? '')}
            loading={isLoading}
            emptyTitle='No projects'
            emptyDescription='Click + New project to create one.'
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r) => (
                  <Link
                    to={href(`projects/${String(r.id)}`)}
                    onClick={() => {
                      if (r.id !== undefined) {
                        setActiveProject(r.id);
                      }
                    }}
                  >
                    <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                  </Link>
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
                render: (r) => <StatusChip status={r.status} />,
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
      </Panel>
    </>
  );
}
