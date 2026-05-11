import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  AegisShell,
  InboxPage,
  RequireAuth,
  ThemeToggle,
} from '@OperationsPAI/aegis-ui';

import { DemoAuthProvider } from './auth/DemoAuthProvider';
import { DemoNotificationProvider } from './notifications/DemoNotificationProvider';
import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import { galleryApp } from './apps/gallery';
import { portalApp } from './apps/portal';
import { settingsApp } from './apps/settings';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Forbidden } from './pages/errors/Forbidden';
import { NotFound } from './pages/errors/NotFound';
import { ServerError } from './pages/errors/ServerError';

export function ConsoleApp(): ReactElement {
  return (
    <BrowserRouter>
      <DemoAuthProvider>
        <Routes>
          <Route path='/auth/login' element={<Login />} />
          <Route path='/auth/register' element={<Register />} />
          <Route path='/auth/forgot' element={<ForgotPassword />} />
          <Route
            path='/*'
            element={
              <RequireAuth
                fallbackPath='/auth/login'
                loadingFallback={
                  <div className='aegis-app-loading'>Loading…</div>
                }
              >
                <DemoNotificationProvider>
                  <AegisShell
                    brand={{ name: 'AegisLab', href: '/' }}
                    apps={[
                      portalApp,
                      containersApp,
                      datasetsApp,
                      settingsApp,
                      galleryApp,
                    ]}
                    notFoundElement={<NotFound />}
                    rootRoutes={[
                      { path: '/', element: <Navigate to='/portal' replace /> },
                      { path: '/inbox', element: <InboxPage /> },
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
                    ]}
                  />
                </DemoNotificationProvider>
              </RequireAuth>
            }
          />
        </Routes>
      </DemoAuthProvider>
    </BrowserRouter>
  );
}
