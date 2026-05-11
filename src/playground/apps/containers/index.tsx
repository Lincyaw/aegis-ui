import { HddOutlined } from '@ant-design/icons';
import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

import type { AegisApp } from '../../../layouts/shell/types';

import { ContainerCreate } from './ContainerCreate';
import { ContainerDetail } from './ContainerDetail';
import { ContainerList } from './ContainerList';
import { ContainersProvider } from './store';

function AppRoot(): ReactElement {
  return (
    <ContainersProvider>
      <Outlet />
    </ContainersProvider>
  );
}

export const containersApp: AegisApp = {
  id: 'containers',
  label: 'Containers',
  icon: <HddOutlined />,
  basePath: '/containers',
  description: 'Manage demo workloads (list / detail / create).',
  sidebar: [
    {
      items: [
        { to: '', label: 'All containers', end: true },
        { to: 'new', label: 'New container' },
      ],
    },
  ],
  routes: [
    {
      element: <AppRoot />,
      children: [
        { path: '', element: <ContainerList /> },
        { path: 'new', element: <ContainerCreate /> },
        { path: ':id', element: <ContainerDetail /> },
      ],
    },
  ],
};
