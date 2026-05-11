import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AegisShell, RequireAuth, ThemeToggle } from '@OperationsPAI/aegis-ui';

import { DemoAuthProvider } from './auth/DemoAuthProvider';
import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import { galleryApp } from './apps/gallery';
import { portalApp } from './apps/portal';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

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
                <AegisShell
                  brand={{ name: 'AegisLab', href: '/' }}
                  apps={[portalApp, containersApp, datasetsApp, galleryApp]}
                  fallbackPath='/portal'
                  headerActions={<ThemeToggle />}
                />
              </RequireAuth>
            }
          />
        </Routes>
      </DemoAuthProvider>
    </BrowserRouter>
  );
}
