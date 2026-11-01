import { type ReactElement, type ReactNode, useId } from 'react';

import {
  DefaultLink,
  type LinkComponent,
} from '../../components/ui/linkComponent';
import { useStrings } from '../../locale';
import './SiteFooter.css';

export interface SiteFooterLink {
  key: string;
  label: ReactNode;
  to: string;
}

export interface SiteFooterColumn {
  key: string;
  title: ReactNode;
  links: SiteFooterLink[];
}

export interface SiteFooterProps {
  /** The brand lockup; the host supplies its own mark and wordmark. */
  brand: ReactNode;
  /** One line under the brand. */
  tagline?: ReactNode;
  columns?: SiteFooterColumn[];
  /** A closing line, such as when the data was last updated. */
  note?: ReactNode;
  /** Drawn as large outlined letters across the bottom; decorative. */
  wordmark?: string;
  linkComponent?: LinkComponent;
  className?: string;
}

/** The public site's footer: brand, link columns and an outlined wordmark. */
export function SiteFooter({
  brand,
  tagline,
  columns = [],
  note,
  wordmark,
  linkComponent: Link = DefaultLink,
  className,
}: SiteFooterProps): ReactElement {
  const strings = useStrings();
  const idPrefix = useId();
  return (
    <footer className={['aegis-site-footer', className ?? ''].join(' ').trim()}>
      <div className="aegis-site-footer__inner">
        <div className="aegis-site-footer__top">
          <div className="aegis-site-footer__brand">
            {brand}
            {tagline !== undefined && (
              <p className="aegis-site-footer__tagline">{tagline}</p>
            )}
          </div>
          {columns.length > 0 && (
            <nav
              className="aegis-site-footer__columns"
              aria-label={strings.siteFooterNavigation}
            >
              {columns.map((column) => {
                const titleId = `${idPrefix}-${column.key}`;
                return (
                  <div key={column.key} className="aegis-site-footer__column">
                    <p id={titleId} className="aegis-site-footer__title">
                      {column.title}
                    </p>
                    <ul
                      className="aegis-site-footer__links"
                      aria-labelledby={titleId}
                    >
                      {column.links.map((link) => (
                        <li key={link.key}>
                          <Link
                            to={link.to}
                            className="aegis-site-footer__link"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
        {note !== undefined && (
          <p className="aegis-site-footer__note">{note}</p>
        )}
        {wordmark !== undefined && (
          <p className="aegis-site-footer__wordmark" aria-hidden="true">
            {wordmark}
          </p>
        )}
      </div>
    </footer>
  );
}
