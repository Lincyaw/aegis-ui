import type { ReactNode } from 'react';

import './ErrorState.css';

interface ErrorStateProps {
  code?: string | number;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}

export function ErrorState({
  code,
  title,
  description,
  action,
  illustration,
  className,
}: ErrorStateProps) {
  const cls = ['aegis-error-state', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {illustration && (
        <div className="aegis-error-state__illustration">{illustration}</div>
      )}
      {code !== undefined && (
        <div className="aegis-error-state__code">{code}</div>
      )}
      <h1 className="aegis-error-state__title">{title}</h1>
      {description && (
        <div className="aegis-error-state__desc">{description}</div>
      )}
      {action && <div className="aegis-error-state__action">{action}</div>}
    </div>
  );
}

export default ErrorState;
