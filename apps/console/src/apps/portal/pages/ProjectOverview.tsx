import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DangerZone,
  EmptyState,
  ErrorState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useActiveProjectStore } from '../hooks/useActiveProject';
import { useDeleteProject, useProject } from '../hooks/useProjects';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const deleteProject = useDeleteProject();

  const numericId = projectId ? Number(projectId) : undefined;
  const { data: project, isLoading, isError, error } = useProject(numericId);

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Loading project…' />
      </div>
    );
  }

  if (isError) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Project not found' />
        <Panel>
          <ErrorState
            title='Failed to load project'
            description={error.message}
          />
        </Panel>
      </div>
    );
  }

  if (!project) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Project not found' />
        <Panel>
          <EmptyState
            title='Project not found'
            description='It may have been removed.'
          />
        </Panel>
      </div>
    );
  }

  const switchAndGo = (to: string): void => {
    if (project.id !== undefined) {
      setActiveProject(project.id);
    }
    navigate(to);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={project.name ?? `Project #${String(project.id ?? '')}`}
        action={
          <div className='page-action-row'>
            <Chip tone={project.status === 'active' ? 'ink' : 'ghost'}>
              {project.status ?? 'unknown'}
            </Chip>
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
        <MetricCard
          label='Containers'
          value={project.containers?.length ?? 0}
        />
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
        <Button
          tone='secondary'
          disabled={deleteProject.isPending}
          onClick={() =>
            modal.confirm({
              title: `Delete ${project.name ?? 'project'}?`,
              content: 'This action cannot be undone.',
              okText: 'Delete',
              okButtonProps: { danger: true },
              onOk: () =>
                new Promise<void>((resolve) => {
                  if (project.id === undefined) {
                    resolve();
                    return;
                  }
                  deleteProject.mutate(project.id, {
                    onSuccess: () => {
                      void msg.success(`Deleted ${project.name ?? 'project'}`);
                      navigate('projects');
                      resolve();
                    },
                    onError: (err) => {
                      void msg.error(`Delete failed: ${err.message}`);
                      resolve();
                    },
                  });
                }),
            })
          }
        >
          Delete project
        </Button>
      </DangerZone>
    </div>
  );
}
