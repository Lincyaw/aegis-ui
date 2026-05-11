import type { HTMLAttributes, ReactNode } from 'react';

import './PageWrapper.css';

export interface PageWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Page root container. Owns `max-width`, `margin`, `padding`, and the
 * staggered fade-in animation. Sub-apps compose pages from this — they
 * must never redefine these properties.
 */
export function PageWrapper({
  children,
  className,
  ...rest
}: PageWrapperProps) {
  const classes = className ? `page-wrapper ${className}` : 'page-wrapper';
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
