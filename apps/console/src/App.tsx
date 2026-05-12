import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AegisShell, InboxPage, ThemeToggle } from '@lincyaw/aegis-ui';

import { SsoAuthProvider } from './auth/SsoAuthProvider';
import { RealNotificationProvider } from './notifications/RealNotificationProvider';
import { Callback } from './pages/auth/Callback';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Landing } from './pages/Landing';
import { Forbidden } from './pages/errors/Forbidden';
import { NotFound } from './pages/errors/NotFound';
import { ServerError } from './pages/errors/ServerError';
import { registeredApps } from './registry';

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
                  apps={registeredApps}
                  notFoundElement={<NotFound />}
                  rootRoutes={[
                    { path: '/', element: <Landing /> },
                    { path: '/inbox', element: <InboxPage /> },
                    {
                      path: '/setup',
                      element: <Navigate to='/settings/endpoints' replace />,
                    },
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
                    {
                      key: 'endpoints',
                      label: 'Endpoints',
                      to: '/settings/endpoints',
                    },
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
