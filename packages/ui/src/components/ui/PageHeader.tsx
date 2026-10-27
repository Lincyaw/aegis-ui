import type { ReactNode } from 'react';

import { MetricLabel } from './MetricLabel';
import './PageHeader.css';
import { PanelTitle } from './PanelTitle';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Label row under the description, e.g. a type badge and a version. */
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  meta,
  action,
  className,
}: PageHeaderProps) {
  const cls = ['aegis-page-header', className ?? ''].filter(Boolean).join(' ');

  return (
    <header className={cls}>
      <div className="aegis-page-header__text">
        <PanelTitle size="lg" as="h1" className="aegis-page-header__title">
          {title}
        </PanelTitle>
        {description && (
          <MetricLabel className="aegis-page-header__description">
            {description}
          </MetricLabel>
        )}
        {meta !== undefined && (
          <div className="aegis-page-header__meta">{meta}</div>
        )}
      </div>
      {action && <div className="aegis-page-header__action">{action}</div>}
    </header>
  );
}
