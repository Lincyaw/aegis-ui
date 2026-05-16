import {
  ApiOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import { CaseDetailPage } from './pages/CaseDetailPage';
import { CaseListPage } from './pages/CaseListPage';
import { SettingsPage } from './pages/SettingsPage';
import { SftPage } from './pages/SftPage';

export const llmharnessReviewApp: AegisApp = {
  id: 'llmharness-review',
  label: 'Case Review',
  icon: <ExperimentOutlined />,
  basePath: '/cases',
  description:
    'Browse llmharness-aggregate case directories: trajectory, firings, verdicts.',
  requiresAuth: false,
  sidebar: [
    {
      items: [
        { to: '', label: 'Cases', icon: <UnorderedListOutlined />, end: true },
        { to: 'sft', label: 'SFT preview', icon: <DatabaseOutlined /> },
        { to: 'settings', label: 'Connection', icon: <ApiOutlined /> },
      ],
    },
  ],
  routes: [
    { path: '', element: <CaseListPage /> },
    { path: 'sft', element: <SftPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: ':caseId', element: <CaseDetailPage /> },
  ],
};

export default llmharnessReviewApp;
