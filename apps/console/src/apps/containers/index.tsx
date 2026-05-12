import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { HddOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { type AegisApp, useActiveApp } from '@lincyaw/aegis-ui';
import { Button, Input } from 'antd';

import { ContainerCreate } from './ContainerCreate';
import { ContainerDetail } from './ContainerDetail';
import { ContainerList } from './ContainerList';
import { ContainersProvider, useContainers } from './store';

/**
 * Demo pattern: toolbar-style app header. Sits below the shell header,
 * sticky, app-scoped. Shows a search field + primary action.
 */
function ContainersHeader(): ReactElement {
  const { query, setQuery } = useContainers();
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
      }}
    >
      <Input
        size='small'
        placeholder='Search containers…'
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 280 }}
        allowClear
      />
      <Button
        type='primary'
        size='small'
        icon={<PlusOutlined />}
        onClick={() => navigate(`${basePath}/new`)}
        style={{ marginLeft: 'auto' }}
      >
        New
      </Button>
    </div>
  );
}

function wrapWithContainersProvider(children: ReactNode): ReactNode {
  return <ContainersProvider>{children}</ContainersProvider>;
}

export const containersApp: AegisApp = {
  id: 'containers',
  label: 'Containers',
  icon: <HddOutlined />,
  basePath: '/containers',
  description: 'Toolbar header + sidebar nav pattern.',
  header: <ContainersHeader />,
  wrap: wrapWithContainersProvider,
  sidebar: [
    {
      items: [
        { to: '', label: 'All containers', end: true },
        { to: 'new', label: 'New container' },
      ],
    },
  ],
  routes: [
    { path: '', element: <ContainerList /> },
    { path: 'new', element: <ContainerCreate /> },
    { path: ':id', element: <ContainerDetail /> },
  ],
};
