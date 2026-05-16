import {
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  Navigate,
  type RouteObject,
  useLocation,
  useNavigate,
  useRoutes,
} from 'react-router-dom';

import {
  AegisAgentProvider,
  AskOverlay,
  type ShellSnapshot,
} from '../../agent';
import { type AegisAuthUser, useAuth } from '../../auth';
import { Chip } from '../../components/ui/Chip';
import { ThemeContext } from '../../theme/themeContext';
import { PageWrapper } from '../PageWrapper';
import './AegisShell.css';
import { AuthRequiredCard } from './AuthRequiredCard';
import { BreadcrumbBar } from './BreadcrumbBar';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ActiveAppContext } from './activeAppContext';
import { ActiveAppEnvironmentProvider } from './environments';
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
  notFoundElement,
  user,
  userMenu,
  headerCenter,
  headerActions,
  inboxPath,
  onAppSwitch,
}: AegisShellProps): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const auth = useAuth();
  const themeCtx = useContext(ThemeContext);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState<boolean>(readSidebarCollapsed);
  const [inlineSlot, setInlineSlot] = useState<HTMLDivElement | null>(null);

  const resolvedUser = useMemo<AegisUser | undefined>(() => {
    if (user) {
      return user;
    }
    if (auth.status !== 'authenticated' || !auth.user) {
      return undefined;
    }
    const menu = [...(userMenu ?? [])];
    if (auth.signOut) {
      menu.push({
        key: 'sign-out',
        label: 'Sign out',
        onClick: () => {
          void auth.signOut?.();
        },
      });
    }
    return { name: auth.user.name, menu };
  }, [user, userMenu, auth]);

  const visibleApps = useMemo(
    () => apps.filter((app) => isAppVisible(app, auth.status, auth.user)),
    [apps, auth.status, auth.user],
  );

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
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  const routeTree = useMemo<RouteObject[]>(() => {
    const appRoutes: RouteObject[] = apps.map((app) => ({
      path: `${stripTrailingSlash(app.basePath)}/*`,
      element: (
        <PageWrapper>
          {isAppVisible(app, auth.status, auth.user) ? (
            <AppRoutes app={app} />
          ) : (
            <AuthRequiredCard
              app={app}
              status={auth.status}
              user={auth.user}
              onSignIn={
                auth.signIn
                  ? () => {
                      void auth.signIn?.({});
                    }
                  : undefined
              }
            />
          )}
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

    const fallback: RouteObject | null = notFoundElement
      ? { path: '*', element: <PageWrapper>{notFoundElement}</PageWrapper> }
      : fallbackPath
        ? { path: '*', element: <Navigate to={fallbackPath} replace /> }
        : null;

    return [
      ...bareRootRoutes,
      ...inShellRootRoutes,
      ...appRoutes,
      ...(fallback ? [fallback] : []),
    ];
  }, [apps, rootRoutes, fallbackPath, notFoundElement, auth]);

  const element = useRoutes(routeTree);

  const shellSnapshot = useCallback((): ShellSnapshot => {
    const w = typeof window !== 'undefined' ? window : null;
    return {
      currentAppId: activeApp?.id ?? null,
      route: {
        pathname,
        search: location.search,
        params: {},
      },
      breadcrumbs: [],
      theme: themeCtx?.resolved ?? 'light',
      viewport: {
        width: w?.innerWidth ?? 0,
        height: w?.innerHeight ?? 0,
      },
    };
  }, [activeApp, pathname, location.search, themeCtx]);

  // Bare routes (e.g. /login) render without the shell chrome.
  const isBareRoute = rootRoutes.some(
    (r) => r.bare && r.path && pathname === r.path,
  );
  if (isBareRoute) {
    return <div>{element}</div>;
  }

  const appHasSidebar = Boolean(
    activeApp?.sidebar && activeApp.sidebar.length > 0,
  );
  const hasSidebar = appHasSidebar && !sidebarCollapsed;

  const shellClass = [
    'aegis-shell',
    hasSidebar ? 'aegis-shell--with-sidebar' : 'aegis-shell--no-sidebar',
    mobileNavOpen ? 'aegis-shell--mobile-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AegisAgentProvider
      appId={activeApp?.id ?? null}
      shellSnapshot={shellSnapshot}
      navigate={navigate}
    >
      <ActiveAppEnvironmentProvider app={activeApp}>
        <div className={shellClass}>
          <TopHeader
            brand={brand}
            apps={visibleApps}
            activeAppId={activeApp?.id}
            onAppSwitch={onAppSwitch}
            user={resolvedUser}
            headerCenter={headerCenter}
            headerActions={
              <>
                {headerActions}
                {auth.status === 'unauthenticated' && auth.signIn && (
                  <Chip
                    tone="ink"
                    onClick={() => {
                      void auth.signIn?.({});
                    }}
                  >
                    Sign in
                  </Chip>
                )}
              </>
            }
            inboxPath={auth.status === 'authenticated' ? inboxPath : undefined}
            onMobileMenuToggle={toggleMobileNav}
            showMobileMenu={hasSidebar}
            sidebarCollapsible={appHasSidebar}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={toggleSidebar}
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
          <AskOverlay />
        </div>
      </ActiveAppEnvironmentProvider>
    </AegisAgentProvider>
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

const SIDEBAR_COLLAPSED_KEY = 'aegis-shell.sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function isAppVisible(
  app: AegisApp,
  status: 'loading' | 'authenticated' | 'unauthenticated',
  user: AegisAuthUser | null,
): boolean {
  if (app.requiresAuth === false) {
    return true;
  }
  if (status !== 'authenticated') {
    return false;
  }
  if (!app.requiredRoles || app.requiredRoles.length === 0) {
    return true;
  }
  const userRoles = user?.roles ?? [];
  return app.requiredRoles.some((r) => userRoles.includes(r));
}
