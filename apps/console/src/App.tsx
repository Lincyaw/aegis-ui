import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  AegisShell,
  InboxPage,
  ThemeToggle,
  useAuth,
} from '@OperationsPAI/aegis-ui';

import { SsoAuthProvider } from './auth/SsoAuthProvider';
import { RealNotificationProvider } from './notifications/RealNotificationProvider';
import { blobApp } from './apps/blob';
import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import { galleryApp } from './apps/gallery';
import { portalApp } from './apps/portal';
import { settingsApp } from './apps/settings';
import { trajectoriesApp } from './apps/trajectories';
import { Callback } from './pages/auth/Callback';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Setup } from './pages/Setup';
import { Forbidden } from './pages/errors/Forbidden';
import { NotFound } from './pages/errors/NotFound';
import { ServerError } from './pages/errors/ServerError';

function RootRedirect(): ReactElement {
  const { status } = useAuth();
  return (
    <Navigate
      to={status === 'authenticated' ? '/portal' : '/trajectories'}
      replace
    />
  );
}

export function ConsoleApp(): ReactElement {
  return (
    <BrowserRouter>
      <SsoAuthProvider>
        <Routes>
          <Route path='/auth/login' element={<Login />} />
          <Route path='/auth/register' element={<Register />} />
          <Route path='/auth/forgot' element={<ForgotPassword />} />
          <Route path='/auth/callback' element={<Callback />} />
          <Route
            path='/*'
            element={
              <RealNotificationProvider>
                <AegisShell
                  brand={{ name: 'AegisLab', href: '/' }}
                  apps={[
                    portalApp,
                    containersApp,
                    datasetsApp,
                    trajectoriesApp,
                    blobApp,
                    settingsApp,
                    galleryApp,
                  ]}
                  notFoundElement={<NotFound />}
                  rootRoutes={[
                    { path: '/', element: <RootRedirect /> },
                    { path: '/inbox', element: <InboxPage /> },
                    { path: '/setup', element: <Setup /> },
                    { path: '/error/forbidden', element: <Forbidden /> },
                    { path: '/error/server', element: <ServerError /> },
                  ]}
                  headerActions={<ThemeToggle />}
                  inboxPath='/inbox'
                  userMenu={[
                    {
                      key: 'profile',
                      label: 'Profile',
                      to: '/settings/profile',
                    },
                    { key: 'settings', label: 'Settings', to: '/settings' },
                    { key: 'connection', label: 'Connection', to: '/setup' },
                  ]}
                />
              </RealNotificationProvider>
            }
          />
        </Routes>
      </SsoAuthProvider>
    </BrowserRouter>
  );
}
