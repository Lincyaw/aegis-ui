import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  Navigate,
  type RouteObject,
  useLocation,
  useRoutes,
} from 'react-router-dom';

import { useAuth } from '../../auth';
import { PageWrapper } from '../PageWrapper';
import './AegisShell.css';
import { BreadcrumbBar } from './BreadcrumbBar';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ActiveAppContext } from './activeAppContext';
import type { AegisApp, AegisShellProps, AegisUser } from './types';

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
  const auth = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [inlineSlot, setInlineSlot] = useState<HTMLDivElement | null>(null);

  const resolvedUser = useMemo<AegisUser | undefined>(() => {
    if (user) {
      return user;
    }
    if (auth.status !== 'authenticated' || !auth.user) {
      return undefined;
    }
    return {
      name: auth.user.name,
      menu: auth.signOut
        ? [
            {
              key: 'sign-out',
              label: 'Sign out',
              onClick: () => {
                void auth.signOut?.();
              },
            },
          ]
        : [],
    };
  }, [user, auth]);

  const activeApp = useMemo(
    () => findActiveApp(apps, pathname),
    [apps, pathname],
  );

  const activeAppValue = useMemo(
    () =>
      activeApp
        ? { id: activeApp.id, basePath: stripTrailingSlash(activeApp.basePath) }
        : null,
    [activeApp],
  );

  useEffect(() => {
    assertUniqueBasePaths(apps);
  }, [apps]);

  // Auto-close the drawer on navigation.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(
    () => setMobileNavOpen((open) => !open),
    [],
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

  const hasSidebar = Boolean(
    activeApp?.sidebar && activeApp.sidebar.length > 0,
  );

  const shellClass = [
    'aegis-shell',
    hasSidebar ? 'aegis-shell--with-sidebar' : 'aegis-shell--no-sidebar',
    mobileNavOpen ? 'aegis-shell--mobile-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <TopHeader
        brand={brand}
        apps={apps}
        activeAppId={activeApp?.id}
        onAppSwitch={onAppSwitch}
        user={resolvedUser}
        headerCenter={headerCenter}
        headerActions={headerActions}
        onMobileMenuToggle={toggleMobileNav}
        showMobileMenu={hasSidebar}
        inlineSlotRef={setInlineSlot}
        inlineSlotActive={Boolean(activeApp?.header)}
      />
      {hasSidebar && <Sidebar activeApp={activeApp} />}
      <button
        type="button"
        className="aegis-shell__backdrop"
        aria-label="Close navigation"
        onClick={closeMobileNav}
      />
      <main className="aegis-shell__main">
        {renderAppRegion(
          activeApp,
          activeAppValue,
          <>
            {activeApp?.header &&
              inlineSlot &&
              createPortal(activeApp.header, inlineSlot)}
            <BreadcrumbBar apps={apps} activeApp={activeApp} />
            <div className="aegis-shell__content">{element}</div>
          </>,
        )}
      </main>
    </div>
  );
}

function AppRoutes({ app }: { app: AegisApp }): ReactElement | null {
  return useRoutes(app.routes);
}

function renderAppRegion(
  app: AegisApp | undefined,
  appValue: { id: string; basePath: string } | null,
  children: ReactElement,
): ReactElement {
  if (!app || !appValue) {
    return children;
  }
  const inner = (
    <ActiveAppContext.Provider value={appValue}>
      {children}
    </ActiveAppContext.Provider>
  );
  return app.wrap ? <>{app.wrap(inner)}</> : inner;
}

function assertUniqueBasePaths(apps: AegisApp[]): void {
  const seen = new Map<string, string>();
  for (const app of apps) {
    const key = stripTrailingSlash(app.basePath);
    const prev = seen.get(key);
    if (prev) {
      // eslint-disable-next-line no-console
      console.error(
        `AegisShell: duplicate basePath "${key}" on apps "${prev}" and "${app.id}". ` +
          `Routing will collide — give each app a unique basePath.`,
      );
    }
    seen.set(key, app.id);
  }
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
  if (p === '/') {
    return '';
  }
  return p.endsWith('/') ? p.slice(0, -1) : p;
}
