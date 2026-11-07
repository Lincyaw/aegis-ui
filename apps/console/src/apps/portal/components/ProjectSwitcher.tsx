import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  MonoValue,
  type ProjectOption,
  ProjectSelector,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useProjectsList } from '../api/projects';
import { useActiveProject } from '../hooks/useActiveProject';

import { StatusChip } from './StatusChip';

import './ProjectSwitcher.css';

export function ProjectSwitcher() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const { data } = useProjectsList();
  const { projectId, setActiveProject } = useActiveProject();
  const list = data?.items ?? [];

  const options: ProjectOption[] = list.map((p) => ({
    id: String(p.id ?? ''),
    name: p.name ?? '—',
    meta: (
      <>
        <StatusChip status={p.status} />
        <MonoValue size='sm'>{p.injection_count ?? 0} inj</MonoValue>
      </>
    ),
  }));

  const handleSelect = (id: string) => {
    const project = list.find((p) => String(p.id ?? '') === id);
    if (project?.id !== undefined && project.id !== projectId) {
      setActiveProject(project.id);
      void msg.success(`Switched to ${project.name ?? 'project'}`);
    }
  };

  return (
    <div className='project-switcher-bar'>
      <div className='project-switcher-bar__left'>
        <ProjectSelector
          projects={options}
          selectedId={projectId === undefined ? undefined : String(projectId)}
          onSelect={handleSelect}
          placeholder='No project'
          footerItems={[
            {
              key: 'view-all',
              label: 'View all projects',
              icon: <AppstoreOutlined />,
              onClick: () => navigate('projects'),
            },
            {
              key: 'new',
              label: 'New project',
              icon: <PlusOutlined />,
              onClick: () => navigate('projects/new'),
            },
          ]}
        />
      </div>
      <div className='project-switcher-bar__center' />
      <div className='project-switcher-bar__right'>
        <Button tone='primary' onClick={() => navigate('inject')}>
          Quick inject
        </Button>
      </div>
    </div>
  );
}

export default ProjectSwitcher;
