/**
 * Live Inspect sub-app — consumer of the AgentM ``live_inspector``
 * WebSocket atom. Renders the running agent tree + every spawned
 * extractor / auditor child in real time.
 */

import { ApiOutlined, RadarChartOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import { ConnectionPage } from './pages/ConnectionPage';
import { LivePage } from './pages/LivePage';

export const llmharnessLiveApp: AegisApp = {
  id: 'llmharness-live',
  label: 'Live Inspect',
  icon: <RadarChartOutlined />,
  basePath: '/live',
  description:
    'Stream the AgentM session tree (main + extractor + auditor) over the live_inspector WebSocket.',
  requiresAuth: false,
  sidebar: [
    {
      items: [
        { to: '', label: 'Sessions', icon: <RadarChartOutlined />, end: true },
        { to: 'settings', label: 'Connection', icon: <ApiOutlined /> },
      ],
    },
  ],
  routes: [
    { path: '', element: <LivePage /> },
    { path: 'settings', element: <ConnectionPage /> },
  ],
};

export default llmharnessLiveApp;
