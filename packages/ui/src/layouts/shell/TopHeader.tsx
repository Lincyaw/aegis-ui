import type { ReactElement, ReactNode } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import {
  type DropdownItem,
  DropdownMenu,
} from '../../components/ui/DropdownMenu';
import { EnvironmentSwitcher } from '../../components/ui/EnvironmentSwitcher';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { AppSwitcher } from './AppSwitcher';
import { useEnvironmentManifest } from './environments';
import type { AegisApp, AegisBrand, AegisUser } from './types';

interface TopHeaderProps {
  brand: AegisBrand;
  apps: AegisApp[];
  activeAppId?: string;
  onAppSwitch?: (appId: string) => void;
  user?: AegisUser;
  headerCenter?: ReactNode;
  headerActions?: ReactNode;
  /** When set, render a notification bell linking to this path. */
  inboxPath?: string;
  /** Fired by the mobile hamburger; the shell owns the open state. */
  onMobileMenuToggle?: () => void;
  /** Whether to render the mobile hamburger at all (only when sidebar exists). */
  showMobileMenu?: boolean;
  /** Whether to render the desktop sidebar collapse toggle. */
  sidebarCollapsible?: boolean;
  /** Current collapsed state — drives aria-pressed on the toggle. */
  sidebarCollapsed?: boolean;
  /** Fired by the desktop collapse button; the shell owns the state. */
  onSidebarToggle?: () => void;
  /**
   * Ref callback for the inline app-header slot. The active app's
   * `header` is portalled into this node so it appears inside the shell
   * header instead of below it.
   */
  inlineSlotRef?: (node: HTMLDivElement | null) => void;
  /** When true, hide the global `headerCenter` (an app header took it over). */
  inlineSlotActive?: boolean;
}

export function TopHeader({
  brand,
  apps,
  activeAppId,
  onAppSwitch,
  user,
  headerCenter,
  headerActions,
  inboxPath,
  onMobileMenuToggle,
  showMobileMenu,
  sidebarCollapsible,
  sidebarCollapsed,
  onSidebarToggle,
  inlineSlotRef,
  inlineSlotActive,
}: TopHeaderProps): ReactElement {
  const brandInner = (
    <>
      {brand.logo && (
        <span className="aegis-shell__brand-logo">{brand.logo}</span>
      )}
      <span>{brand.name}</span>
    </>
  );

  return (
    <header className="aegis-shell__header">
      <div className="aegis-shell__header-left">
        {showMobileMenu && onMobileMenuToggle && (
          <button
            type="button"
            className="aegis-shell__menu-toggle"
            onClick={onMobileMenuToggle}
            aria-label="Open navigation"
          >
            <span className="aegis-shell__menu-toggle-glyph" aria-hidden="true">
              ☰
            </span>
          </button>
        )}
        {sidebarCollapsible && onSidebarToggle && (
          <button
            type="button"
            className="aegis-shell__sidebar-toggle"
            onClick={onSidebarToggle}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <span
              className="aegis-shell__sidebar-toggle-glyph"
              aria-hidden="true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                <line x1="8" y1="3.5" x2="8" y2="16.5" />
              </svg>
            </span>
          </button>
        )}
        <AppSwitcher
          apps={apps}
          activeAppId={activeAppId}
          onAppSwitch={onAppSwitch}
        />
        {brand.href ? (
          <Link to={brand.href} className="aegis-shell__brand">
            {brandInner}
          </Link>
        ) : (
          <span className="aegis-shell__brand">{brandInner}</span>
        )}
      </div>
      <div
        className="aegis-shell__header-center"
        ref={inlineSlotRef}
        data-aegis-inline-slot=""
      >
        {!inlineSlotActive && headerCenter}
      </div>
      <div className="aegis-shell__header-right">
        <ActiveEnvironmentSwitcher />
        {headerActions}
        {inboxPath && <NotificationBell inboxPath={inboxPath} />}
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}

function ActiveEnvironmentSwitcher(): ReactElement | null {
  const state = useEnvironmentManifest();
  if (state.status !== 'ready') {
    return null;
  }
  const options = state.manifest.environments.map((e) => ({
    id: e.id,
    label: e.label,
    badge: e.badge,
    hint: e.baseUrl,
  }));
  return (
    <EnvironmentSwitcher
      options={options}
      currentId={state.currentEnvId}
      onChange={state.setCurrentEnv}
    />
  );
}

function UserMenu({ user }: { user: AegisUser }): ReactElement {
  const navigate = useNavigate();
  const items: DropdownItem[] = (user.menu ?? []).map((entry) => {
    const to = entry.to;
    return {
      key: entry.key,
      label: entry.label,
      onClick: to
        ? () => {
            navigate(to);
          }
        : entry.onClick,
    };
  });
  const trigger = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {user.avatar}
      <span>{user.name}</span>
    </span>
  );
  if (items.length === 0) {
    return trigger;
  }
  return <DropdownMenu trigger={trigger} items={items} />;
}
