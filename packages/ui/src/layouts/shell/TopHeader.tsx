import type { ReactElement, ReactNode } from 'react';

import { Link } from 'react-router-dom';

import {
  type DropdownItem,
  DropdownMenu,
} from '../../components/ui/DropdownMenu';
import { AppSwitcher } from './AppSwitcher';
import type { AegisApp, AegisBrand, AegisUser } from './types';

interface TopHeaderProps {
  brand: AegisBrand;
  apps: AegisApp[];
  activeAppId?: string;
  onAppSwitch?: (appId: string) => void;
  user?: AegisUser;
  headerCenter?: ReactNode;
  headerActions?: ReactNode;
  /** Fired by the mobile hamburger; the shell owns the open state. */
  onMobileMenuToggle?: () => void;
  /** Whether to render the mobile hamburger at all (only when sidebar exists). */
  showMobileMenu?: boolean;
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
  onMobileMenuToggle,
  showMobileMenu,
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
        {headerActions}
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: AegisUser }): ReactElement {
  const items: DropdownItem[] = (user.menu ?? []).map((entry) => ({
    key: entry.key,
    label: entry.label,
    onClick: entry.onClick,
  }));
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
