import { NodeIndexOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import { Compare } from './pages/Compare';
import { SessionDetail } from './pages/SessionDetail';
import { SessionList } from './pages/SessionList';

export const trajectoriesApp: AegisApp = {
  id: 'trajectories',
  label: 'Trajectories',
  icon: <NodeIndexOutlined />,
  basePath: '/trajectories',
  description: 'Read-only viewer for AgentM OTel traces stored in ClickHouse.',
  requiresAuth: false,
  sidebar: [
    {
      items: [
        { to: '', label: 'Sessions', end: true },
        { to: 'compare', label: 'Compare' },
      ],
    },
  ],
  routes: [
    { path: '', element: <SessionList /> },
    { path: 'compare', element: <Compare /> },
    { path: ':rootSessionId', element: <SessionDetail /> },
  ],
};
