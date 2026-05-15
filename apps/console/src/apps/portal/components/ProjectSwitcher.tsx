import { CaretDownOutlined, PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { App as AntdApp, Dropdown, type MenuProps } from 'antd';

import { Button, useAppNavigate } from '@lincyaw/aegis-ui';

import { useActiveProjectId, useMockStore } from '../mocks';

import './ProjectSwitcher.css';

export function ProjectSwitcher() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const projects = useMockStore((s) => s.projects);
  const activeId = useActiveProjectId();
  const setActiveProject = useMockStore((s) => s.setActiveProject);

  const active = projects.find((p) => p.id === activeId) ?? projects[0];

  const items: MenuProps['items'] = [
    {
      key: 'projects-heading',
      label: <span className='project-switcher__heading'>Projects</span>,
      type: 'group',
      children: projects.map((p) => ({
        key: p.id,
        label: (
          <div className='project-switcher__item'>
            <span className='project-switcher__item-name'>{p.name}</span>
            <span
              className={`project-switcher__chip project-switcher__chip--${p.status}`}
            >
              {p.status}
            </span>
            <span className='project-switcher__meta'>
              {p.injectionCount} inj
            </span>
          </div>
        ),
        onClick: () => {
          if (p.id !== activeId) {
            setActiveProject(p.id);
            void msg.success(`Switched to ${p.name}`);
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
