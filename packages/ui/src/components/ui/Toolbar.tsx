import type { ReactNode } from 'react';

import './Toolbar.css';

export interface ToolbarProps {
  /** Leading controls, e.g. a `SearchInput` and its filter chips. */
  left?: ReactNode;
  center?: ReactNode;
  /** Trailing actions. */
  right?: ReactNode;
  /**
   * `default` is a padded row over a list or table. `page` is a page's top
   * bar, `--page-bar-height` high: its title on the left (a `PanelTitle`
   * as `h1`), its selectors and buttons on the right. `sub` is the
   * `--sub-bar-height` row under it, e.g. a trace path or a run's facts.
   * Each draws a hairline below; `page` and `sub` sit flush with the page's
   * edges, so a bleed page stacks them over its `PaneLayout`.
   */
  variant?: 'default' | 'page' | 'sub';
  className?: string;
}

/** A row of controls over a list or table: left, optional center, right. */
export function Toolbar({
  left,
  center,
  right,
  variant = 'default',
  className,
}: ToolbarProps) {
  const cls = [
    'aegis-toolbar',
    variant === 'default' ? '' : `aegis-toolbar--${variant}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <div className="aegis-toolbar__left">{left}</div>
      {center !== undefined ? (
        <div className="aegis-toolbar__center">{center}</div>
      ) : null}
      {right !== undefined ? (
        <div className="aegis-toolbar__right">{right}</div>
      ) : null}
    </div>
  );
}
