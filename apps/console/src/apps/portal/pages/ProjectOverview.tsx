import { App as AntdApp } from 'antd';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DangerZone,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const project = useMockStore((s) => s.projects.find((p) => p.id === projectId));
  const setActiveProject = useMockStore((s) => s.setActiveProject);
  const injections = useMockStore((s) =>
    s.injections.filter((i) => i.projectId === projectId),
  );
  const traces = useMockStore((s) =>
    s.traces.filter((t) => t.projectId === projectId),
  );

  const running = useMemo(
    () => injections.filter((i) => i.status === 'running').length,
    [injections],
  );

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
    setActiveProject(project.id);
    navigate(to);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={project.name}
        description={project.description}
        action={
          <div className='page-action-row'>
            <Chip tone={project.status === 'active' ? 'ink' : 'ghost'}>
              {project.status}
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
          value={injections.length}
          onClick={() => switchAndGo('injections')}
        />
        <MetricCard label='Running' value={running} />
        <MetricCard
          label='Traces'
          value={traces.length}
          onClick={() => switchAndGo('traces')}
        />
        <MetricCard label='Status' value={project.status} />
      </div>

      <Panel title={<PanelTitle size='base'>Settings</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'project id', v: <MonoValue size='sm'>{project.id}</MonoValue> },
            { k: 'name', v: project.name },
            { k: 'description', v: project.description || '—' },
            { k: 'status', v: project.status },
            { k: 'created', v: <TimeDisplay value={project.createdAt} /> },
            { k: 'default namespace', v: <MonoValue size='sm'>aegis-default</MonoValue> },
          ]}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Members</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'lincyaw', v: 'owner' },
            { k: 'boxiyu', v: 'maintainer' },
          ]}
        />
      </Panel>

      <DangerZone
        title='Danger zone'
        description='Permanently delete this project and all associated data.'
      >
        <Button
          tone='secondary'
          onClick={() =>
            modal.confirm({
              title: `Delete ${project.name}?`,
              content: 'This action cannot be undone (mock — no-op).',
              okText: 'Delete',
              okButtonProps: { danger: true },
              onOk: () => {
                void msg.info('Delete is mocked — no change applied.');
              },
            })
          }
        >
          Delete project
        </Button>
      </DangerZone>
    </div>
  );
}
