import { type ComponentType, type ReactElement, type ReactNode } from 'react';

import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Optional destination. If omitted, the item renders as plain text. */
  to?: string;
}

/**
 * Render-prop signature for routed links. Sub-apps that use a router
 * (`react-router-dom`, `@tanstack/router`, Next.js) pass a wrapper that
 * forwards to their `<Link>`. Keeping this contract minimal so the primitive
 * has zero router dependency.
 */
export type BreadcrumbLinkComponent = ComponentType<{
  to: string;
  className?: string;
  children: ReactNode;
}>;

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  /**
   * Component used to render linked breadcrumb items. Defaults to an
   * unstyled `<a href>`. Sub-apps using a router should pass their
   * Link adapter here.
   */
  linkComponent?: BreadcrumbLinkComponent;
}

const DefaultLink: BreadcrumbLinkComponent = ({ to, className, children }) => (
  <a href={to} className={className}>
    {children}
  </a>
);

export function Breadcrumb({
  items,
  className,
  linkComponent,
}: BreadcrumbProps): ReactElement {
  const cls = ['aegis-breadcrumb', className ?? ''].filter(Boolean).join(' ');
  const LinkImpl = linkComponent ?? DefaultLink;

  return (
    <nav aria-label="Breadcrumb" className={cls}>
      <ol className="aegis-breadcrumb__list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="aegis-breadcrumb__item">
              {item.to && !isLast ? (
                <LinkImpl to={item.to} className="aegis-breadcrumb__link">
                  {item.label}
                </LinkImpl>
              ) : (
                <span
                  className={
                    isLast
                      ? 'aegis-breadcrumb__text aegis-breadcrumb__text--current'
                      : 'aegis-breadcrumb__text'
                  }
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="aegis-breadcrumb__sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
