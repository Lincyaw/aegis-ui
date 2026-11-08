import type { ReactNode } from 'react';

import {
  ApiOutlined,
  AuditOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import {
  ReviewLocaleProvider,
  ReviewLocaleSwitch,
} from './locale/ReviewLocale';
import { ConnectionPage } from './pages/ConnectionPage';
import { TaskListPage } from './pages/TaskListPage';
import { WorkspacePage } from './pages/WorkspacePage';

import { ReviewRoot } from './ReviewContext';

function wrapReview(children: ReactNode): ReactNode {
  return <ReviewLocaleProvider>{children}</ReviewLocaleProvider>;
}

export const reviewApp: AegisApp = {
  id: 'review',
  label: 'Review',
  icon: <AuditOutlined />,
  basePath: '/review',
  description:
    'Judge items against telemetry evidence drawn as a circuit board, and save a verdict for each.',
  requiresAuth: false,
  header: <ReviewLocaleSwitch />,
  wrap: wrapReview,
  sidebar: [
    {
      items: [
        { to: '', label: 'Tasks', icon: <UnorderedListOutlined />, end: true },
        { to: 'connection', label: 'Connection', icon: <ApiOutlined /> },
      ],
    },
  ],
  routes: [
    {
      element: <ReviewRoot />,
      children: [
        { path: '', element: <TaskListPage /> },
        { path: 'connection', element: <ConnectionPage /> },
        { path: ':taskId', element: <WorkspacePage /> },
        { path: ':taskId/:itemId', element: <WorkspacePage /> },
      ],
    },
  ],
};

export default reviewApp;
