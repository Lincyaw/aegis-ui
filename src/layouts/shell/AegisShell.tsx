import { type ReactElement, useMemo } from 'react';
import {
  Navigate,
  type RouteObject,
  useLocation,
  useRoutes,
} from 'react-router-dom';

import { PageWrapper } from '../PageWrapper';

import { BreadcrumbBar } from './BreadcrumbBar';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import type { AegisApp, AegisShellProps } from './types';

import './AegisShell.css';

/**
 * Top-level layout: top header, two-section sidebar, breadcrumb bar, and
 * a routed content area composed from `apps`.
 *
 * Each app's `routes` is mounted under its `basePath`. The shell renders
 * the chrome around every app — apps themselves only render page content
 * inside a `<PageWrapper>` (the shell wraps the outlet automatically).
 */
export function AegisShell({
  brand,
  apps,
  rootRoutes = [],
  fallbackPath,
  user,
  headerCenter,
  headerActions,
  onAppSwitch,
}: AegisShellProps): ReactElement {
  const { pathname } = useLocation();

  const activeApp = useMemo(
    () => findActiveApp(apps, pathname),
    [apps, pathname],
  );

  const routeTree = useMemo<RouteObject[]>(() => {
    const appRoutes: RouteObject[] = apps.map((app) => ({
      path: `${stripTrailingSlash(app.basePath)}/*`,
      element: (
        <PageWrapper>
          <AppRoutes app={app} />
        </PageWrapper>
      ),
    }));

    const inShellRootRoutes = rootRoutes
      .filter((r) => !r.bare)
      .map(
        ({ bare: _bare, element, ...rest }): RouteObject => ({
          ...rest,
          element: <PageWrapper>{element}</PageWrapper>,
        }),
      );

    const bareRootRoutes = rootRoutes
      .filter((r) => r.bare)
      .map(({ bare: _bare, ...rest }): RouteObject => rest);

    const fallback: RouteObject | null = fallbackPath
      ? { path: '*', element: <Navigate to={fallbackPath} replace /> }
      : null;

    return [
      ...bareRootRoutes,
      ...inShellRootRoutes,
      ...appRoutes,
      ...(fallback ? [fallback] : []),
    ];
  }, [apps, rootRoutes, fallbackPath]);

  const element = useRoutes(routeTree);

  // Bare routes (e.g. /login) render without the shell chrome.
  const isBareRoute = rootRoutes.some(
    (r) => r.bare && r.path && pathname === r.path,
  );
  if (isBareRoute) {
    return <div>{element}</div>;
  }

  return (
    <div className="aegis-shell">
      <TopHeader
        brand={brand}
        user={user}
        headerCenter={headerCenter}
        headerActions={headerActions}
      />
      <Sidebar apps={apps} activeApp={activeApp} onAppSwitch={onAppSwitch} />
      <main className="aegis-shell__main">
        <BreadcrumbBar apps={apps} activeApp={activeApp} />
        <div className="aegis-shell__content">{element}</div>
      </main>
    </div>
  );
}

function AppRoutes({ app }: { app: AegisApp }): ReactElement | null {
  return useRoutes(app.routes);
}

function findActiveApp(
  apps: AegisApp[],
  pathname: string,
): AegisApp | undefined {
  // Longest-prefix wins so that nested basePaths still work.
  const candidates = apps
    .filter((app) => {
      const base = stripTrailingSlash(app.basePath);
      return pathname === base || pathname.startsWith(`${base}/`);
    })
    .sort((a, b) => b.basePath.length - a.basePath.length);
  return candidates[0];
}

function stripTrailingSlash(p: string): string {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}
