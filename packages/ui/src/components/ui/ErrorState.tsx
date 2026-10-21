import type { ReactNode } from 'react';

import './ErrorState.css';

interface ErrorStateProps {
  code?: string | number;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  illustration?: ReactNode;
  /**
   * `page` (default) fills most of the viewport for full-page errors.
   * `compact` drops the minimum height and uses a smaller title for errors
   * inside a panel, pane or sidebar.
   */
  size?: 'page' | 'compact';
  className?: string;
}

export function ErrorState({
  code,
  title,
  description,
  action,
  illustration,
  size = 'page',
  className,
}: ErrorStateProps) {
  const cls = [
    'aegis-error-state',
    size === 'compact' ? 'aegis-error-state--compact' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const Title = size === 'compact' ? 'p' : 'h1';
  return (
    <div className={cls}>
      {illustration && (
        <div className="aegis-error-state__illustration">{illustration}</div>
      )}
      {code !== undefined && (
        <div className="aegis-error-state__code">{code}</div>
      )}
      <Title className="aegis-error-state__title">{title}</Title>
      {description && (
        <div className="aegis-error-state__desc">{description}</div>
      )}
      {action && <div className="aegis-error-state__action">{action}</div>}
    </div>
  );
}
