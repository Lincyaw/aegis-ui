import { Navigate } from 'react-router-dom';

import {
  ApiOutlined,
  BellOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  KeyOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import ApiKeys from './pages/ApiKeys';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import OidcClients from './pages/OidcClients';
import Profile from './pages/Profile';
import Roles from './pages/Roles';
import Teams from './pages/Teams';
import Users from './pages/Users';

import { Setup } from '../../pages/Setup';

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
        { to: 'oidc-clients', label: 'OIDC Clients', icon: <ApiOutlined /> },
        { to: 'audit', label: 'Audit Logs', icon: <FileTextOutlined /> },
      ],
    },
    {
      label: 'System',
      items: [
        { to: 'endpoints', label: 'Endpoints', icon: <CloudServerOutlined /> },
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
    { path: 'oidc-clients', element: <OidcClients /> },
    { path: 'audit', element: <AuditLogs /> },
    { path: 'endpoints', element: <Setup /> },
  ],
};
