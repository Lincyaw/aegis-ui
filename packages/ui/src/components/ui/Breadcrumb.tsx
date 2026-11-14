import { type ReactElement, type ReactNode } from 'react';

import { useStrings } from '../../locale';
import './Breadcrumb.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Optional destination. If omitted, the item renders as plain text. */
  to?: string;
  /**
   * Marks the item as the current page: `aria-current="page"` and main ink.
   * When no item sets it, the last item is the current page and renders as
   * text. Once any item sets it, every item with `to` renders as a link,
   * the last included, and only the items set to `true` are current, so a
   * trail can end at a page other than the one shown.
   */
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Accessible name of the navigation. Defaults to the locale's `breadcrumb`. */
  ariaLabel?: string;
  /**
   * Component used to render linked breadcrumb items. Defaults to an
   * unstyled `<a href>`. Sub-apps using a router should pass their
   * Link adapter here.
   */
  linkComponent?: LinkComponent;
}

export function Breadcrumb({
  items,
  className,
  ariaLabel,
  linkComponent,
}: BreadcrumbProps): ReactElement {
  const strings = useStrings();
  const cls = ['aegis-breadcrumb', className ?? ''].filter(Boolean).join(' ');
  const LinkImpl = linkComponent ?? DefaultLink;
  const explicit = items.some((item) => item.current !== undefined);

  return (
    <nav aria-label={ariaLabel ?? strings.breadcrumb} className={cls}>
      <ol className="aegis-breadcrumb__list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isCurrent = explicit ? item.current === true : isLast;
          const linked = item.to !== undefined && (explicit || !isLast);
          return (
            <li key={idx} className="aegis-breadcrumb__item">
              {linked && item.to !== undefined ? (
                <LinkImpl
                  to={item.to}
                  className={
                    isCurrent
                      ? 'aegis-breadcrumb__link aegis-breadcrumb__link--current'
                      : 'aegis-breadcrumb__link'
                  }
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </LinkImpl>
              ) : (
                <span
                  className={
                    isCurrent
                      ? 'aegis-breadcrumb__text aegis-breadcrumb__text--current'
                      : 'aegis-breadcrumb__text'
                  }
                  aria-current={isCurrent ? 'page' : undefined}
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
