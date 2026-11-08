import type { ComponentType, ReactNode } from 'react';

/**
 * Router link adapter for primitives that render links. Routed apps pass a
 * wrapper around their router's `<Link>`; without one the primitive renders
 * a plain `<a href>`, so primitives stay router-agnostic. Pass
 * `aria-current` and `tabIndex` on to the anchor: navigation primitives
 * mark the current page with the first, and a tree keeps the links in its
 * rows out of the tab order with the second.
 */
export type LinkComponent = ComponentType<{
  to: string;
  className?: string;
  'aria-current'?: 'page';
  tabIndex?: number;
  children: ReactNode;
}>;

export const DefaultLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  tabIndex,
  children,
}) => (
  <a
    href={to}
    className={className}
    aria-current={ariaCurrent}
    tabIndex={tabIndex}
  >
    {children}
  </a>
);
