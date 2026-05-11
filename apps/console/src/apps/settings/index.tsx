import {
  BellOutlined,
  FileTextOutlined,
  KeyOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Navigate } from 'react-router-dom';

import type { AegisApp } from '@OperationsPAI/aegis-ui';

import ApiKeys from './pages/ApiKeys';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Roles from './pages/Roles';
import Teams from './pages/Teams';
import Users from './pages/Users';

export const settingsApp: AegisApp = {
  id: 'settings',
  label: 'Settings',
  description: 'Account preferences and workspace administration.',
  icon: <SettingOutlined />,
  basePath: '/settings',
  hidden: true,
  sidebar: [
    {
      label: 'Account',
      items: [
        { to: 'profile', label: 'Profile', icon: <UserOutlined /> },
        { to: 'notifications', label: 'Notifications', icon: <BellOutlined /> },
        { to: 'api-keys', label: 'API Keys', icon: <KeyOutlined /> },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { to: 'users', label: 'Users', icon: <TeamOutlined /> },
        { to: 'teams', label: 'Teams', icon: <UsergroupAddOutlined /> },
        { to: 'roles', label: 'Roles & Permissions', icon: <SafetyOutlined /> },
        { to: 'audit', label: 'Audit Logs', icon: <FileTextOutlined /> },
      ],
    },
  ],
  routes: [
    { path: '', element: <Navigate to='profile' replace /> },
    { path: 'profile', element: <Profile /> },
    { path: 'notifications', element: <Notifications /> },
    { path: 'api-keys', element: <ApiKeys /> },
    { path: 'users', element: <Users /> },
    { path: 'teams', element: <Teams /> },
    { path: 'roles', element: <Roles /> },
    { path: 'audit', element: <AuditLogs /> },
  ],
};
