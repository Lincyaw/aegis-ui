import type { ReactElement } from 'react';

import { ProfileOutlined } from '@ant-design/icons';
import { NavLink } from 'react-router-dom';

import type { AegisApp } from '../../../layouts/shell/types';
import { DatasetBrowse } from './DatasetBrowse';
import { DatasetDetail } from './DatasetDetail';
import { DatasetUpload } from './DatasetUpload';
import { DatasetsProvider } from './store';

/**
 * Demo pattern: tabs-in-header. No left sidebar — primary nav lives in
 * the app's sub-header as horizontal tabs.
 */
function DatasetsHeader(): ReactElement {
  const tabs = [
    { to: '/datasets', label: 'Browse', end: true },
    { to: '/datasets/upload', label: 'Upload' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
      }}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            isActive
              ? 'aegis-shell__app-tab aegis-shell__app-tab--active'
              : 'aegis-shell__app-tab'
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}

export const datasetsApp: AegisApp = {
  id: 'datasets',
  label: 'Datasets',
  icon: <ProfileOutlined />,
  basePath: '/datasets',
  description: 'Tabs-in-header pattern (no left sidebar).',
  header: <DatasetsHeader />,
  wrap: (children) => <DatasetsProvider>{children}</DatasetsProvider>,
  routes: [
    { path: '', element: <DatasetBrowse /> },
    { path: 'upload', element: <DatasetUpload /> },
    { path: ':id', element: <DatasetDetail /> },
  ],
};
