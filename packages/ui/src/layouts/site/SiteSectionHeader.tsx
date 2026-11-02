import type { ReactElement, ReactNode } from 'react';

import './SiteSectionHeader.css';

export interface SiteSectionHeaderProps {
  /** The noun the section is about, e.g. "排行榜". */
  eyebrow?: ReactNode;
  /** The section's conclusion, as a sentence. */
  title: ReactNode;
  lead?: ReactNode;
  /** The heading's id, for a section's `aria-labelledby`. */
  id?: string;
  /** The heading level. Defaults to `h2`. */
  as?: 'h1' | 'h2' | 'h3';
  /** Beside the heading, e.g. a link to the full list. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The opening of a band of the public site: the noun in an eyebrow and the
 * conclusion as the title, so the heading alone tells the finding.
 */
export function SiteSectionHeader({
  eyebrow,
  title,
  lead,
  id,
  as: Heading = 'h2',
  actions,
  className,
}: SiteSectionHeaderProps): ReactElement {
  return (
    <header
      className={['aegis-site-section-header', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="aegis-site-section-header__text">
        {eyebrow !== undefined && (
          <p className="aegis-site-section-header__eyebrow">{eyebrow}</p>
        )}
        <Heading id={id} className="aegis-site-section-header__title">
          {title}
        </Heading>
        {lead !== undefined && (
          <p className="aegis-site-section-header__lead">{lead}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="aegis-site-section-header__actions">{actions}</div>
      )}
    </header>
  );
}
