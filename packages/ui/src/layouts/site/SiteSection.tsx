import type { ReactElement, ReactNode } from 'react';

import './SiteSection.css';

export interface SiteSectionProps {
  /** Anchor target; the section stops below the sticky nav when jumped to. */
  id?: string;
  /**
   * `plain` sits on the page and is divided from a plain neighbour by a
   * hairline; `tint` fills the full width with `--bg-tint`.
   */
  tone?: 'plain' | 'tint';
  /** Labels the section region, usually the id of its heading. */
  'aria-labelledby'?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A band of the public site. Its background runs the full width; its
 * content sits in the site's content column, so pages never set their
 * own width or side padding.
 */
export function SiteSection({
  id,
  tone = 'plain',
  'aria-labelledby': labelledBy,
  className,
  children,
}: SiteSectionProps): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={[
        'aegis-site-section',
        `aegis-site-section--${tone}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="aegis-site-section__inner">{children}</div>
    </section>
  );
}
