import type { HTMLAttributes, ReactNode } from 'react';

import './PageWrapper.css';

export interface PageWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * Fills the view under the shell's header edge to edge, with no padding
   * and no gap between its blocks: a column of `Toolbar` bars over a
   * `PaneLayout` that takes the rest of the height.
   */
  bleed?: boolean;
}

/**
 * Page root container. Owns `max-width`, `margin`, `padding`, and the
 * staggered fade-in animation. Sub-apps compose pages from this — they
 * must never redefine these properties.
 */
export function PageWrapper({
  children,
  bleed = false,
  className,
  ...rest
}: PageWrapperProps) {
  const classes = [
    'page-wrapper',
    bleed ? 'page-wrapper--bleed' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
