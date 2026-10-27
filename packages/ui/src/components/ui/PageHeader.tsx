import type { ReactNode } from 'react';

import { MetricLabel } from './MetricLabel';
import './PageHeader.css';
import { PanelTitle } from './PanelTitle';

interface PageHeaderProps {
  title: string;
  /** Inline content beside the title, e.g. a verdict badge and scores. */
  titleExtra?: ReactNode;
  /** One line under the title; may carry inline content such as an avatar. */
  description?: ReactNode;
  /** Label row under the description, e.g. a type badge and a version. */
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  titleExtra,
  description,
  meta,
  action,
  className,
}: PageHeaderProps) {
  const cls = ['aegis-page-header', className ?? ''].filter(Boolean).join(' ');
  const heading = (
    <PanelTitle size="lg" as="h1" className="aegis-page-header__title">
      {title}
    </PanelTitle>
  );

  return (
    <header className={cls}>
      <div className="aegis-page-header__text">
        {titleExtra === undefined ? (
          heading
        ) : (
          <div className="aegis-page-header__title-row">
            {heading}
            <div className="aegis-page-header__title-extra">{titleExtra}</div>
          </div>
        )}
        {description ? (
          <MetricLabel className="aegis-page-header__description">
            {description}
          </MetricLabel>
        ) : null}
        {meta !== undefined && (
          <div className="aegis-page-header__meta">{meta}</div>
        )}
      </div>
      {action && <div className="aegis-page-header__action">{action}</div>}
    </header>
  );
}
