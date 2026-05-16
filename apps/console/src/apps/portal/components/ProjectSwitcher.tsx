import {
  CaretDownOutlined,
  PlusOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { Button, useAppNavigate } from '@lincyaw/aegis-ui';
import { App as AntdApp, Dropdown, type MenuProps } from 'antd';

import { useActiveProjectStore } from '../hooks/useActiveProject';
import { useProjectsList } from '../hooks/useProjects';

import './ProjectSwitcher.css';

export function ProjectSwitcher() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const { data: projects } = useProjectsList();
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);

  const list = projects ?? [];
  const active = list.find((p) => p.id === activeId) ?? list[0];

  const items: MenuProps['items'] = [
    {
      key: 'projects-heading',
      label: <span className='project-switcher__heading'>Projects</span>,
      type: 'group',
      children: list.map((p) => ({
        key: String(p.id ?? ''),
        label: (
          <div className='project-switcher__item'>
            <span className='project-switcher__item-name'>{p.name ?? '—'}</span>
            <span
              className={`project-switcher__chip project-switcher__chip--${p.status ?? 'unknown'}`}
            >
              {p.status ?? 'unknown'}
            </span>
            <span className='project-switcher__meta'>
              {p.injection_count ?? 0} inj
            </span>
          </div>
        ),
        onClick: () => {
          if (p.id !== undefined && p.id !== activeId) {
            setActiveProject(p.id);
            void msg.success(`Switched to ${p.name ?? 'project'}`);
          }
        },
      })),
    },
    { type: 'divider' },
    {
      key: 'view-all',
      label: 'View all projects',
      onClick: () => navigate('projects'),
    },
    { type: 'divider' },
    {
      key: 'new',
      label: (
        <span className='project-switcher__new'>
          <PlusOutlined /> New project
        </span>
      ),
      onClick: () => navigate('projects/new'),
    },
  ];

  return (
    <div className='project-switcher-bar'>
      <div className='project-switcher-bar__left'>
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          placement='bottomLeft'
          overlayClassName='project-switcher__overlay'
        >
          <button type='button' className='project-switcher__trigger'>
            <ProjectOutlined className='project-switcher__icon' />
            <span className='project-switcher__name'>
              {active?.name ?? 'No project'}
            </span>
            <CaretDownOutlined className='project-switcher__caret' />
          </button>
        </Dropdown>
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
