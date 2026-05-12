import type { ReactNode } from 'react';

import type { RouteObject } from 'react-router-dom';

import type { Command } from '../../commands';

/**
 * One entry in an app's internal left-nav. Sub-app authors only have to
 * fill the URL and label; the shell renders + highlights.
 */
export interface AegisAppNavItem {
  /** Relative path within the app, e.g. 'list' or 'create'. */
  to: string;
  label: string;
  icon?: ReactNode;
  /** Match `to` exactly (default: false, matches as prefix). */
  end?: boolean;
}

export interface AegisAppNavGroup {
  /** Optional section heading. Omit for an ungrouped list. */
  label?: string;
  items: AegisAppNavItem[];
}

/**
 * Contract every sub-app exposes. Apps are presentational + routed; they
 * don't render the chrome themselves — the shell does.
 */
export interface AegisApp {
  /** Stable identifier — used for analytics + as React key. */
  id: string;
  /** Display name in the global app list. */
  label: string;
  /** Icon shown next to the label in the sidebar's global section. */
  icon: ReactNode;
  /** All routes mount under this path. Must start with '/'. */
  basePath: string;
  /**
   * react-router v6 routes. Paths inside are relative to `basePath`.
   * Use route.lazy for code-splitting.
   */
  routes: RouteObject[];
  /** Optional inner sidebar shown when this app is active. */
  sidebar?: AegisAppNavGroup[];
  /**
   * Optional sub-header rendered between the shell's `TopHeader` and the
   * page content. Use for app-scoped toolbars, tab nav, filters, etc.
   * Sticky by default so it stays in view while the page scrolls.
   *
   * Rendered inside `wrap`, so it can read from the app's Context.
   */
  header?: ReactNode;
  /**
   * Optional wrapper applied to the active app's region (header + page
   * content). Use to mount Context providers shared between `header` and
   * the routes — anything declared here is in scope for both.
   *
   * Must be a stable reference (module-level function or `useCallback`).
   * Inlining `wrap={(c) => <P>{c}</P>}` re-mounts the provider on every
   * shell render, blowing away its state.
   */
  wrap?: (children: ReactNode) => ReactNode;
  /** Optional one-line description shown in app pickers. */
  description?: string;
  /**
   * If true, the app's routes still mount but it is omitted from the
   * AppSwitcher. Use for configuration surfaces that are reachable from
   * the user menu rather than the app launcher (e.g. /settings).
   */
  hidden?: boolean;
  /**
   * Commands exposed by this app. Registered by AegisShell when this
   * app becomes active. (Contract only — wiring is a separate task.)
   */
  commands?: Command[];
  /**
   * If false, the app is reachable by anonymous (unauthenticated) users
   * and appears in the AppSwitcher / sidebar regardless of auth state.
   * Default true — protected apps are hidden from anonymous users and
   * routes show a sign-in CTA instead of content.
   */
  requiresAuth?: boolean;
  /**
   * Optional list of role tags. When set, only authenticated users whose
   * `AegisAuthUser.roles` overlaps with this list can see the app. Apps
   * without `requiredRoles` are visible to any authenticated user
   * (subject to `requiresAuth`).
   */
  requiredRoles?: string[];
}

export interface AegisUserMenuItem {
  key: string;
  label: ReactNode;
  /** Router path to navigate to on click. Mutually exclusive with onClick. */
  to?: string;
  onClick?: () => void;
}

export interface AegisBrand {
  name: ReactNode;
  logo?: ReactNode;
  /** Optional click target for the brand area (e.g. home path). */
  href?: string;
}

export interface AegisUser {
  name: ReactNode;
  avatar?: ReactNode;
  /** Right-aligned dropdown entries in the top header. */
  menu?: AegisUserMenuItem[];
}

export interface AegisShellProps {
  brand: AegisBrand;
  apps: AegisApp[];
  /**
   * Routes mounted at root (outside any app). Useful for a landing page
   * or `/login`. Renders inside the shell unless `bare` is set.
   */
  rootRoutes?: Array<RouteObject & { bare?: boolean }>;
  /** Where to redirect when the URL doesn't match any app. */
  fallbackPath?: string;
  /**
   * Rendered (inside the shell chrome) when the URL matches no app and
   * no `rootRoutes`. Takes precedence over `fallbackPath` — pass one or
   * the other depending on whether you want a 404 page or a redirect.
   */
  notFoundElement?: ReactNode;
  user?: AegisUser;
  /**
   * User dropdown entries used when `user` is not passed explicitly and
   * the shell is auto-building the menu from `useAuth()`. A Sign out
   * entry (calling `signOut` from the auth context) is appended
   * automatically when available.
   */
  userMenu?: AegisUserMenuItem[];
  /** Slot rendered in the top header center (e.g. global search). */
  headerCenter?: ReactNode;
  /** Slot rendered in the top header right side, before the user menu. */
  headerActions?: ReactNode;
  /**
   * When set, a notification bell is rendered in the top header (between
   * `headerActions` and the user menu) and clicking "View all" routes to
   * this path. When omitted, the bell is not rendered — apps without a
   * notification provider don't show an empty bell.
   */
  inboxPath?: string;
  /** Fired when the user navigates between apps. */
  onAppSwitch?: (appId: string) => void;
  /**
   * When true, AegisShell mounts <CommandPalette/> and threads
   * active-app scope into the command registry. Requires
   * <CommandProvider/> above the shell. (Contract only — wiring is a
   * separate task.)
   */
  enableCommandPalette?: boolean;
  /**
   * When provided, AegisShell renders the node as a collapsible right-side
   * panel (typically <AgentPanel/> filled with messages from useAgent()).
   * The open state is owned by the host (read via the agent context's
   * panelOpen field). Requires <AgentProvider/> above the shell.
   */
  agentPanel?: ReactNode;
}
