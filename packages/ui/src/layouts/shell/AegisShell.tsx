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
  matchRoutes,
  useHref,
  useLocation,
  useNavigate,
  useRoutes,
} from 'react-router-dom';

import {
  AegisRuntimeProvider,
  AskOverlay,
  type ShellSnapshot,
} from '../../agent';
import { useAuth } from '../../auth';
import { useHasCommandProvider } from '../../commands';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { Chip } from '../../components/ui/Chip';
import { useStorageItem } from '../../hooks/useStorageItem';
import { useWindowScrolled } from '../../hooks/useWindowScrolled';
import { useStrings } from '../../locale';
import { ThemeContext } from '../../theme/themeContext';
import { SkipLink } from '../SkipLink';
import './AegisShell.css';
import { BreadcrumbBar } from './BreadcrumbBar';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ShellCommandPalette } from './ShellCommandPalette';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ActiveAppContext } from './activeAppContext';
import { assertUniqueBasePaths, findActiveApp, isAppVisible } from './apps';
import { buildRouteTree } from './buildRouteTree';
import { EnvironmentProvider } from './environments';
import { normalizeBasePath } from './paths';
import type { AegisApp, AegisShellProps } from './types';
import { useAgentPanel } from './useAgentPanel';
import { useAppCommands } from './useAppCommands';
import { useMobileNav } from './useMobileNav';
import { useShellUser } from './useShellUser';
import { useWarnOnce } from './useWarnOnce';

const SIDEBAR_COLLAPSED_KEY = 'aegis-shell.sidebar-collapsed';

/**
 * Top-level layout: top header, two-section sidebar, breadcrumb bar, and
 * a routed content area composed from `apps`.
 *
 * Each app's `routes` is mounted under its `basePath`. The shell renders
 * the chrome around every app — apps themselves only render page content
 * inside a `<PageWrapper>` (the shell wraps the outlet automatically). A
 * page that throws while rendering shows an error with a retry in the page
 * area; the chrome stays up.
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
  commandGroupOrder,
  agentPanel,
  agentRuntime,
}: AegisShellProps): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const strings = useStrings();
  const { pathname } = location;
  const auth = useAuth();
  const themeCtx = useContext(ThemeContext);
  const [sidebarCollapsedValue, setSidebarCollapsedValue] = useStorageItem(
    SIDEBAR_COLLAPSED_KEY,
  );
  const sidebarCollapsed = sidebarCollapsedValue === '1';
  const [inlineSlot, setInlineSlot] = useState<HTMLDivElement | null>(null);
  const windowScrolled = useWindowScrolled();
  const headerScrolled = elevateHeaderOnScroll && windowScrolled;
  const mainRef = useRef<HTMLElement>(null);

  const resolvedUser = useShellUser(user, userMenu, auth);

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

  useAppCommands(visibleApps, activeApp?.id);
  const hasCommandProvider = useHasCommandProvider();
  useWarnOnce(
    enableCommandPalette && !hasCommandProvider,
    'AegisShell: enableCommandPalette needs a <CommandProvider> above the shell; the command palette is not mounted.',
  );

  const agent = useAgentPanel(agentPanel);
  const mobileNav = useMobileNav(pathname);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedValue(sidebarCollapsed ? '0' : '1');
  }, [setSidebarCollapsedValue, sidebarCollapsed]);

  const routeTree = useMemo(
    () =>
      buildRouteTree({ apps, rootRoutes, fallbackPath, notFoundElement, auth }),
    [apps, rootRoutes, fallbackPath, notFoundElement, auth],
  );
  const element = useRoutes(routeTree.routes);
  const matches = matchRoutes(routeTree.routes, location);
  const topRoute = matches ? matches[0].route : undefined;
  const page = (
    <RouteErrorBoundary resetKey={location.key}>{element}</RouteErrorBoundary>
  );

  const rootHref = useHref('/');
  // A hash router's href is not a path prefix, so it reports none.
  const basename = rootHref.startsWith('/')
    ? rootHref.replace(/\/+$/, '')
    : undefined;

  const shellSnapshot = useCallback((): ShellSnapshot => {
    const w = typeof window !== 'undefined' ? window : null;
    return {
      currentAppId: activeApp?.id ?? null,
      route: {
        pathname,
        search: location.search,
        params: {},
        basename,
      },
      breadcrumbs: [],
      theme: themeCtx?.resolved ?? 'light',
      viewport: {
        width: w?.innerWidth ?? 0,
        height: w?.innerHeight ?? 0,
      },
    };
  }, [activeApp, pathname, location.search, basename, themeCtx]);

  // Bare routes (e.g. /login) render without the shell chrome.
  if (topRoute && routeTree.bareRoutes.has(topRoute)) {
    return <div>{page}</div>;
  }

  const appHasSidebar = Boolean(
    activeApp?.sidebar && activeApp.sidebar.length > 0,
  );
  const hasSidebar = appHasSidebar && !sidebarCollapsed;

  const shellClass = [
    'aegis-shell',
    hasSidebar ? 'aegis-shell--with-sidebar' : 'aegis-shell--no-sidebar',
    mobileNav.open ? 'aegis-shell--mobile-nav-open' : '',
    agent.open ? 'aegis-shell--with-agent-panel' : '',
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
      <EnvironmentProvider app={activeApp}>
        <div ref={mobileNav.shellRef} className={shellClass}>
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
            onMobileMenuToggle={mobileNav.toggle}
            mobileMenuOpen={mobileNav.open}
            menuToggleRef={mobileNav.toggleRef}
            showMobileMenu={appHasSidebar}
            sidebarCollapsible={appHasSidebar}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={toggleSidebar}
            inlineSlotRef={setInlineSlot}
            inlineSlotActive={Boolean(activeApp?.header)}
            agentPanelOpen={agent.open}
            onAgentPanelToggle={agent.toggle}
          />
          {appHasSidebar && (
            <Sidebar activeApp={activeApp} drawerRef={mobileNav.drawerRef} />
          )}
          <button
            ref={mobileNav.backdropRef}
            type="button"
            className="aegis-shell__backdrop"
            aria-label={strings.closeNavigation}
            tabIndex={-1}
            onClick={mobileNav.dismiss}
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
                  <BreadcrumbBar activeApp={activeApp} />
                )}
                <div className="aegis-shell__content">{page}</div>
              </>,
            )}
          </main>
          {agent.open && (
            <div className="aegis-shell__agent-panel">{agentPanel}</div>
          )}
          <AskOverlay />
          {enableCommandPalette && hasCommandProvider && (
            <ShellCommandPalette groupOrder={commandGroupOrder} />
          )}
        </div>
      </EnvironmentProvider>
    </AegisRuntimeProvider>
  );
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
