import type { ComponentType, ReactNode } from 'react';

/**
 * Router link adapter for primitives that render links. Routed apps pass a
 * wrapper around their router's `<Link>`; without one the primitive renders
 * a plain `<a href>`, so primitives stay router-agnostic. Pass
 * `aria-current`, `aria-label` and `tabIndex` on to the anchor: navigation
 * primitives mark the current page or item with the first, a link whose
 * text is short names itself in full with the second, and a tree keeps the
 * links in its rows out of the tab order with the third.
 */
export type LinkComponent = ComponentType<{
  to: string;
  className?: string;
  'aria-current'?: 'page' | 'true';
  'aria-label'?: string;
  tabIndex?: number;
  children: ReactNode;
}>;

export const DefaultLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  'aria-label': ariaLabel,
  tabIndex,
  children,
}) => (
  <a
    href={to}
    className={className}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    tabIndex={tabIndex}
  >
    {children}
  </a>
);
