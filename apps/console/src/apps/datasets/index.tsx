import type { ReactElement, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { ProfileOutlined } from '@ant-design/icons';
import { type AegisApp, useActiveApp } from '@lincyaw/aegis-ui';

import { DatasetBrowse } from './DatasetBrowse';
import { DatasetDetail } from './DatasetDetail';
import { DatasetUpload } from './DatasetUpload';
import { DatasetsProvider } from './store';

/**
 * Demo pattern: tabs-in-header. No left sidebar — primary nav lives in
 * the app's sub-header as horizontal tabs.
 */
function DatasetsHeader(): ReactElement {
  const { basePath } = useActiveApp();
  const tabs = [
    { to: basePath, label: 'Browse', end: true },
    { to: `${basePath}/upload`, label: 'Upload' },
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

function wrapWithDatasetsProvider(children: ReactNode): ReactNode {
  return <DatasetsProvider>{children}</DatasetsProvider>;
}

export const datasetsApp: AegisApp = {
  id: 'datasets',
  label: 'Datasets',
  icon: <ProfileOutlined />,
  basePath: '/datasets',
  description: 'Tabs-in-header pattern (no left sidebar).',
  header: <DatasetsHeader />,
  wrap: wrapWithDatasetsProvider,
  routes: [
    { path: '', element: <DatasetBrowse /> },
    { path: 'upload', element: <DatasetUpload /> },
    { path: ':id', element: <DatasetDetail /> },
  ],
};
