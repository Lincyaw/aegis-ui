import type { ReactNode } from 'react';

import './Alert.css';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  /** `error` is the anomaly tone — only for failures, never for emphasis. */
  tone?: AlertTone;
  /** Strong heading over a muted body, e.g. a verdict and its summary. */
  title?: ReactNode;
  /** Leading icon in place of the tone dot, e.g. a verdict glyph. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Alert({
  tone = 'info',
  title,
  icon,
  children,
  className,
}: AlertProps) {
  const cls = [
    'aegis-alert',
    `aegis-alert--${tone}`,
    title === undefined ? '' : 'aegis-alert--titled',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} role="status">
      <span className="aegis-alert__marker" aria-hidden="true">
        {icon ?? <span className="aegis-alert__dot" />}
      </span>
      <div className="aegis-alert__content">
        {title !== undefined && (
          <span className="aegis-alert__title">{title}</span>
        )}
        <span className="aegis-alert__body">{children}</span>
      </div>
    </div>
  );
}
