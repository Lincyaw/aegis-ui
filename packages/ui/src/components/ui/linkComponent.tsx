import type { ComponentType, ReactNode } from 'react';

/**
 * Router link adapter for primitives that render links. Routed apps pass a
 * wrapper around their router's `<Link>`; without one the primitive renders
 * a plain `<a href>`, so primitives stay router-agnostic. Pass
 * `aria-current` on to the anchor: navigation primitives mark the current
 * page with it.
 */
export type LinkComponent = ComponentType<{
  to: string;
  className?: string;
  'aria-current'?: 'page';
  children: ReactNode;
}>;

export const DefaultLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  children,
}) => (
  <a href={to} className={className} aria-current={ariaCurrent}>
    {children}
  </a>
);
