import type { ReactNode } from 'react';

import './Toolbar.css';

export interface ToolbarProps {
  /** Leading controls, e.g. a `SearchInput` and its filter chips. */
  left?: ReactNode;
  center?: ReactNode;
  /** Trailing actions. */
  right?: ReactNode;
  className?: string;
}

/** A row of controls over a list or table: left, optional center, right. */
export function Toolbar({ left, center, right, className }: ToolbarProps) {
  const cls = ['aegis-toolbar', className ?? ''].filter(Boolean).join(' ');
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
