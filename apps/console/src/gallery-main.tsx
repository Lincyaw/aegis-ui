import { type ReactElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate } from 'react-router-dom';

import '@fontsource-variable/geist';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource/google-sans-code/400.css';
import '@fontsource/google-sans-code/500.css';
import {
  type AegisApp,
  AegisShell,
  getAegisTheme,
  ThemeProvider,
  ThemeToggle,
  useTheme,
} from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { App as AntdApp, ConfigProvider } from 'antd';

import { galleryApp } from './apps/gallery';

// Standalone gallery for the static GitHub Pages build: no SSO, API or
// agent gateway, just the shell around the gallery app.
const apps: AegisApp[] = [
  {
    ...galleryApp,
    basePath: '/',
    routes: [
      ...galleryApp.routes,
      { path: '*', element: <Navigate to='/' replace /> },
    ],
  },
];
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

/** The gallery's mark: drawn at --brand-mark-size by the shell. */
const GALLERY_BRAND_MARK = (
  <svg viewBox='0 0 28 28' aria-hidden='true'>
    <rect width='28' height='28' rx='8' fill='currentColor' />
    <path
      d='M8 19 14 8l6 11'
      fill='none'
      stroke='var(--bg-panel)'
      strokeWidth='2.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

function Root(): ReactElement {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <AntdApp component='div'>
        <BrowserRouter basename={basename}>
          <AegisShell
            brand={{ name: 'aegis-ui', href: '/', logo: GALLERY_BRAND_MARK }}
            apps={apps}
            fallbackPath='/'
            headerActions={<ThemeToggle />}
            appSwitcher={false}
            elevateHeaderOnScroll
          />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('aegis-ui gallery: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>
);
