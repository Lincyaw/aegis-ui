import type { ReactElement, ReactNode } from 'react';

import { Link } from 'react-router-dom';

import {
  type DropdownItem,
  DropdownMenu,
} from '../../components/ui/DropdownMenu';
import type { AegisBrand, AegisUser } from './types';

interface TopHeaderProps {
  brand: AegisBrand;
  user?: AegisUser;
  headerCenter?: ReactNode;
  headerActions?: ReactNode;
  /** Fired by the mobile hamburger; the shell owns the open state. */
  onMobileMenuToggle?: () => void;
}

export function TopHeader({
  brand,
  user,
  headerCenter,
  headerActions,
  onMobileMenuToggle,
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
      {onMobileMenuToggle && (
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
      {brand.href ? (
        <Link to={brand.href} className="aegis-shell__brand">
          {brandInner}
        </Link>
      ) : (
        <span className="aegis-shell__brand">{brandInner}</span>
      )}
      <div className="aegis-shell__header-center">{headerCenter}</div>
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
