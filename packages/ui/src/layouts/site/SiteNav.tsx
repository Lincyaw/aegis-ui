import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  DefaultLink,
  type LinkComponent,
} from '../../components/ui/linkComponent';
import { useWindowScrolled } from '../../hooks/useWindowScrolled';
import { useStrings } from '../../locale';
import './SiteNav.css';

export interface SiteNavItem {
  key: string;
  label: ReactNode;
  to: string;
}

export interface SiteNavProps {
  /** The brand lockup; the host supplies its own mark and wordmark. */
  brand: ReactNode;
  /** Where the brand links to. Defaults to `/`. */
  brandHref?: string;
  items: SiteNavItem[];
  /** The key of the section the page belongs to. */
  activeKey?: string;
  /** Controls at the end of the bar, such as `ThemeToggle`. */
  actions?: ReactNode;
  /**
   * `auto` lies flat at the top of the page and floats once it scrolls;
   * `flat` and `floating` hold one look. Defaults to `auto`.
   */
  variant?: 'auto' | 'flat' | 'floating';
  linkComponent?: LinkComponent;
  className?: string;
}

function MenuIcon({ open }: { open: boolean }): ReactElement {
  return (
    <svg
      className="aegis-site-nav__menu-icon"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" />
      )}
    </svg>
  );
}

/**
 * The public site's top bar. It lies flat on the page at the top and
 * floats as a glass bar once the page scrolls; at 768px and narrower the
 * links fold into a menu.
 */
export function SiteNav({
  brand,
  brandHref = '/',
  items,
  activeKey,
  actions,
  variant = 'auto',
  linkComponent: Link = DefaultLink,
  className,
}: SiteNavProps): ReactElement {
  const strings = useStrings();
  const scrolled = useWindowScrolled();
  const floating = variant === 'floating' || (variant === 'auto' && scrolled);
  const [menuOpen, setMenuOpen] = useState(false);
  // Navigating to another section closes the menu.
  const [menuKey, setMenuKey] = useState(activeKey);
  if (menuKey !== activeKey) {
    setMenuKey(activeKey);
    setMenuOpen(false);
  }
  const menuId = useId();
  const menuRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // A click anywhere but the menu's own background, or Escape, closes
  // the menu; the button toggles it itself.
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (buttonRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target) && !target.closest('a')) {
        return;
      }
      setMenuOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const links = items.map((item) => {
    const current = item.key === activeKey;
    return (
      <li key={item.key}>
        <Link
          to={item.to}
          className={[
            'aegis-site-nav__link',
            current ? 'aegis-site-nav__link--current' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={current ? 'page' : undefined}
        >
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <header
      className={[
        'aegis-site-nav',
        floating ? 'aegis-site-nav--floating' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="aegis-site-nav__bar">
        <Link to={brandHref} className="aegis-site-nav__brand">
          {brand}
        </Link>
        <nav
          className="aegis-site-nav__nav"
          aria-label={strings.siteNavigation}
        >
          <ul className="aegis-site-nav__links">{links}</ul>
        </nav>
        <div className="aegis-site-nav__end">
          {actions}
          <button
            ref={buttonRef}
            type="button"
            className="aegis-site-nav__menu-button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={
              menuOpen ? strings.closeNavigation : strings.openNavigation
            }
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>
      <nav
        ref={menuRef}
        id={menuId}
        className="aegis-site-nav__menu"
        aria-label={strings.siteNavigation}
        hidden={!menuOpen}
      >
        <ul className="aegis-site-nav__menu-links">{links}</ul>
      </nav>
    </header>
  );
}
