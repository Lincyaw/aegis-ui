import type { ReactNode } from 'react';

import type { RouteObject } from 'react-router-dom';

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
  /** Optional one-line description shown in app pickers. */
  description?: string;
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
  menu?: Array<{ key: string; label: ReactNode; onClick?: () => void }>;
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
  user?: AegisUser;
  /** Slot rendered in the top header center (e.g. global search). */
  headerCenter?: ReactNode;
  /** Slot rendered in the top header right side, before the user menu. */
  headerActions?: ReactNode;
  /** Fired when the user navigates between apps. */
  onAppSwitch?: (appId: string) => void;
}
