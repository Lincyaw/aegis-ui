import { ProfileOutlined } from '@ant-design/icons';
import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

import type { AegisApp } from '../../../layouts/shell/types';

import { DatasetBrowse } from './DatasetBrowse';
import { DatasetDetail } from './DatasetDetail';
import { DatasetUpload } from './DatasetUpload';
import { DatasetsProvider } from './store';

function AppRoot(): ReactElement {
  return (
    <DatasetsProvider>
      <Outlet />
    </DatasetsProvider>
  );
}

export const datasetsApp: AegisApp = {
  id: 'datasets',
  label: 'Datasets',
  icon: <ProfileOutlined />,
  basePath: '/datasets',
  description: 'Browse and upload demo datasets.',
  sidebar: [
    {
      items: [
        { to: '', label: 'Browse', end: true },
        { to: 'upload', label: 'Upload' },
      ],
    },
  ],
  routes: [
    {
      element: <AppRoot />,
      children: [
        { path: '', element: <DatasetBrowse /> },
        { path: 'upload', element: <DatasetUpload /> },
        { path: ':id', element: <DatasetDetail /> },
      ],
    },
  ],
};
