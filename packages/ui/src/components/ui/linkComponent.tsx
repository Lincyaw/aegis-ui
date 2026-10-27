import type { ComponentType, ReactNode } from 'react';

/**
 * Router link adapter for primitives that render links. Routed apps pass a
 * wrapper around their router's `<Link>`; without one the primitive renders
 * a plain `<a href>`, so primitives stay router-agnostic.
 */
export type LinkComponent = ComponentType<{
  to: string;
  className?: string;
  children: ReactNode;
}>;

export const DefaultLink: LinkComponent = ({ to, className, children }) => (
  <a href={to} className={className}>
    {children}
  </a>
);
