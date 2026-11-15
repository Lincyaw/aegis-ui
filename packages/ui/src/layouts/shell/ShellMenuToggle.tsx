import { type ReactElement, useContext } from 'react';

import { useStrings } from '../../locale';
import { ShellNavContext } from './shellNavContext';

/**
 * The navigation drawer's toggle, for the page's top bar while the shell
 * runs with `chrome="sidebar"`, which has no header to hold one. It shows
 * at 768 px and below, where the sidebar is the drawer, and renders
 * nothing under a shell that has a header.
 */
export function ShellMenuToggle(): ReactElement | null {
  const strings = useStrings();
  const nav = useContext(ShellNavContext);
  if (!nav) {
    return null;
  }
  return (
    <button
      ref={nav.toggleRef}
      type="button"
      className="aegis-shell__menu-toggle"
      onClick={nav.toggle}
      aria-label={nav.open ? strings.closeNavigation : strings.openNavigation}
      aria-expanded={nav.open}
    >
      <span className="aegis-shell__menu-toggle-glyph" aria-hidden="true">
        ☰
      </span>
    </button>
  );
}
