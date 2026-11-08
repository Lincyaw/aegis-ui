import { useParams } from 'react-router-dom';

import {
  Button,
  DangerZone,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SkeletonText,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useDeleteProject, useProject } from '../api/projects';
import { DeleteButton } from '../components/DeleteButton';
import { LoadError } from '../components/LoadError';
import { StatusChip } from '../components/StatusChip';
import { useActiveProjectStore } from '../state/active-project';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const activeProjectId = useActiveProjectStore((s) => s.activeProjectId);
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const deleteProject = useDeleteProject();

  const numericId = projectId ? Number(projectId) : undefined;
  const { data: project, isLoading, isError, error } = useProject(numericId);

  if (isLoading || isError || !project) {
    return (
      <>
        <PageHeader title={`Project ${projectId ?? ''}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title='Failed to load project'
              notFound={{
                title: 'Project not found',
                description: 'It may have been removed.',
              }}
            />
          ) : (
            <EmptyState
              title='Project not found'
              description={`"${projectId ?? ''}" is not a project id.`}
            />
          )}
        </Panel>
      </>
    );
  }

  const switchAndGo = (to: string): void => {
    if (project.id !== undefined) {
      setActiveProject(project.id);
    }
    navigate(to);
  };

  return (
    <>
      <PageHeader
        title={project.name ?? `Project #${String(project.id ?? '')}`}
        action={
          <div className='page-action-row'>
            <StatusChip status={project.status} />
            <Button tone='primary' onClick={() => switchAndGo('inject')}>
              Switch & inject
            </Button>
          </div>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard
          label='Injections'
          value={project.injection_count ?? 0}
          onClick={() => switchAndGo('injections')}
        />
        <MetricCard label='Executions' value={project.execution_count ?? 0} />
        <MetricCard label='Datasets' value={project.datasets?.length ?? 0} />
        <MetricCard label='Artifacts' value={project.containers?.length ?? 0} />
      </div>

      <Panel title={<PanelTitle size='base'>Settings</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'project id',
              v: <MonoValue size='sm'>{String(project.id ?? '—')}</MonoValue>,
            },
            { k: 'name', v: project.name ?? '—' },
            { k: 'visibility', v: project.is_public ? 'public' : 'private' },
            { k: 'status', v: project.status ?? '—' },
            {
              k: 'created',
              v: project.created_at ? (
                <TimeDisplay value={project.created_at} />
              ) : (
                '—'
              ),
            },
            {
              k: 'last injection',
              v: project.last_injection_at ? (
                <TimeDisplay value={project.last_injection_at} />
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Labels</PanelTitle>}>
        {project.labels && project.labels.length > 0 ? (
          <KeyValueList
            items={project.labels.map((l) => ({
              k: l.key ?? '—',
              v: l.value ?? '—',
            }))}
          />
        ) : (
          <EmptyState title='No labels' description='Add labels via API.' />
        )}
      </Panel>

      <DangerZone
        title='Danger zone'
        description='Permanently delete this project and all associated data.'
      >
        <DeleteButton
          label='Delete project'
          subject={project.name ?? `project ${String(project.id ?? '')}`}
          consequence='The project and all its data are deleted. This cannot be undone.'
          onDelete={async () => {
            if (project.id === undefined) {
              return;
            }
            await deleteProject.mutateAsync(project.id);
            if (activeProjectId === project.id) {
              setActiveProject(null);
            }
            void msg.success(`Deleted ${project.name ?? 'project'}`);
            navigate('projects');
          }}
        />
      </DangerZone>
    </>
  );
}
