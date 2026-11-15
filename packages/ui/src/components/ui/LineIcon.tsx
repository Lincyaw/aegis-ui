import type { ReactNode } from 'react';

import './LineIcon.css';

export interface LineIconProps {
  /**
   * The glyph's geometry on a 24-unit grid: `path`, `circle`, `rect` and
   * the like. The icon strokes them in the current text colour.
   */
  children: ReactNode;
  /** `sm` = `--line-icon-size-sm` (14), `md` 16, `lg` 18. */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible name. Without one the icon is decorative and hidden. */
  title?: string;
  className?: string;
}

/** A stroked line glyph: 24-unit grid, round caps and joins, no fill. */
export function LineIcon({
  children,
  size = 'md',
  title,
  className,
}: LineIconProps) {
  const cls = ['aegis-line-icon', `aegis-line-icon--${size}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title === undefined ? undefined : 'img'}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      focusable="false"
    >
      {title !== undefined && <title>{title}</title>}
      {children}
    </svg>
  );
}
