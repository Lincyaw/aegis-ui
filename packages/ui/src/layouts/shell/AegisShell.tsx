import {
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  AegisRuntimeProvider,
  AskOverlay,
  type ShellSnapshot,
  useAgentChat,
} from '../../agent';
import { defaultAgentChatValue } from '../../agent/chat/chat';
import { type AegisAuthUser, type AuthStatus, useAuth } from '../../auth';
import { type Command, useCommands } from '../../commands';
import { defaultCommandContextValue } from '../../commands/commandContext';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { Chip } from '../../components/ui/Chip';
import { CommandPalette } from '../../components/ui/CommandPalette';
import { useWindowScrolled } from '../../hooks/useWindowScrolled';
import { readStorage, writeStorage } from '../../lib/storage';
import { useStrings } from '../../locale';
import { ThemeContext } from '../../theme/themeContext';
import { PageWrapper } from '../PageWrapper';
import { SkipLink } from '../SkipLink';
import './AegisShell.css';
import { AuthRequiredCard } from './AuthRequiredCard';
import { BreadcrumbBar } from './BreadcrumbBar';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ActiveAppContext } from './activeAppContext';
import { ActiveAppEnvironmentProvider } from './environments';
import { normalizeBasePath } from './paths';
import type { AegisApp, AegisShellProps, AegisUser } from './types';

const SIDEBAR_COLLAPSED_KEY = 'aegis-shell.sidebar-collapsed';

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
  appSwitcher = true,
  elevateHeaderOnScroll = false,
  ambient,
  inboxPath,
  onAppSwitch,
  enableCommandPalette = false,
  agentPanel,
  agentRuntime,
}: AegisShellProps): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const strings = useStrings();
  const { pathname } = location;
  const auth = useAuth();
  const themeCtx = useContext(ThemeContext);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => readStorage(SIDEBAR_COLLAPSED_KEY) === '1',
  );
  const [inlineSlot, setInlineSlot] = useState<HTMLDivElement | null>(null);
  const windowScrolled = useWindowScrolled();
  const headerScrolled = elevateHeaderOnScroll && windowScrolled;
  const mainRef = useRef<HTMLElement>(null);

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
        ? { id: activeApp.id, basePath: normalizeBasePath(activeApp.basePath) }
        : null,
    [activeApp],
  );

  useEffect(() => {
    assertUniqueBasePaths(apps);
  }, [apps]);

  const commandRegistry = useCommands();
  const hasCommandProvider = commandRegistry !== defaultCommandContextValue;
  const { register, setActiveScope } = commandRegistry;
  const activeAppId = activeApp?.id;
  useEffect(() => {
    setActiveScope(activeAppId);
  }, [setActiveScope, activeAppId]);

  const appCommands = useMemo<Command[]>(
    () =>
      visibleApps.flatMap((app) =>
        (app.commands ?? []).map((cmd) => ({ ...cmd, scope: app.id })),
      ),
    [visibleApps],
  );
  useEffect(() => register(appCommands), [register, appCommands]);

  const showCommandPalette = enableCommandPalette && hasCommandProvider;
  useWarnOnce(
    enableCommandPalette && !hasCommandProvider,
    'AegisShell: enableCommandPalette needs a <CommandProvider> above the shell; the command palette is not mounted.',
  );

  const agent = useAgentChat();
  const hasAgentProvider = agent !== defaultAgentChatValue;
  const hasAgentPanel = Boolean(agentPanel);
  useWarnOnce(
    hasAgentPanel && !hasAgentProvider,
    'AegisShell: agentPanel needs an <AgentChatProvider> above the shell; the agent panel is not rendered.',
  );
  const agentPanelEnabled = hasAgentPanel && hasAgentProvider;
  const agentPanelOpen = agentPanelEnabled && agent.panelOpen === true;
  const { setPanelOpen } = agent;
  const toggleAgentPanel = useCallback(() => {
    setPanelOpen?.(!agentPanelOpen);
  }, [setPanelOpen, agentPanelOpen]);

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
      writeStorage(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const routeTree = useMemo<RouteObject[]>(() => {
    const appRoutes: RouteObject[] = apps.map((app) => ({
      path: `${normalizeBasePath(app.basePath)}/*`,
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
    agentPanelOpen ? 'aegis-shell--with-agent-panel' : '',
    ambient ? 'aegis-shell--ambient' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AegisRuntimeProvider
      runtime={agentRuntime}
      appId={activeApp?.id ?? null}
      shellSnapshot={shellSnapshot}
      navigate={navigate}
    >
      <ActiveAppEnvironmentProvider app={activeApp}>
        <div className={shellClass}>
          <SkipLink targetId="aegis-main" targetRef={mainRef} />
          {ambient && <AmbientBackground variant={ambient} />}
          <TopHeader
            brand={brand}
            apps={visibleApps}
            activeAppId={activeApp?.id}
            onAppSwitch={onAppSwitch}
            appSwitcher={appSwitcher}
            scrolled={headerScrolled}
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
            showMobileMenu={appHasSidebar}
            sidebarCollapsible={appHasSidebar}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={toggleSidebar}
            inlineSlotRef={setInlineSlot}
            inlineSlotActive={Boolean(activeApp?.header)}
            agentPanelOpen={agentPanelOpen}
            onAgentPanelToggle={
              agentPanelEnabled && setPanelOpen ? toggleAgentPanel : undefined
            }
          />
          {appHasSidebar && <Sidebar activeApp={activeApp} />}
          <button
            type="button"
            className="aegis-shell__backdrop"
            aria-label={strings.closeNavigation}
            onClick={closeMobileNav}
          />
          <main
            id="aegis-main"
            ref={mainRef}
            tabIndex={-1}
            className="aegis-shell__main"
          >
            {renderAppRegion(
              activeApp,
              activeAppValue,
              <>
                {activeApp?.header &&
                  inlineSlot &&
                  createPortal(activeApp.header, inlineSlot)}
                {activeApp?.breadcrumbBar !== false && (
                  <BreadcrumbBar apps={apps} activeApp={activeApp} />
                )}
                <div className="aegis-shell__content">{element}</div>
              </>,
            )}
          </main>
          {agentPanelOpen && (
            <div className="aegis-shell__agent-panel">{agentPanel}</div>
          )}
          <AskOverlay />
          {showCommandPalette && <CommandPalette />}
        </div>
      </ActiveAppEnvironmentProvider>
    </AegisRuntimeProvider>
  );
}

function useWarnOnce(shouldWarn: boolean, message: string): void {
  const warnedRef = useRef(false);
  useEffect(() => {
    if (shouldWarn && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(message);
    }
  }, [shouldWarn, message]);
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
    const key = normalizeBasePath(app.basePath);
    const prev = seen.get(key);
    if (prev) {
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
      const base = normalizeBasePath(app.basePath);
      return pathname === base || pathname.startsWith(`${base}/`);
    })
    .sort(
      (a, b) =>
        normalizeBasePath(b.basePath).length -
        normalizeBasePath(a.basePath).length,
    );
  return candidates[0];
}

function isAppVisible(
  app: AegisApp,
  status: AuthStatus,
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
