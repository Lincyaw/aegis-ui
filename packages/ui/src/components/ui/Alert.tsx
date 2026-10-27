import { type ReactNode } from 'react';

import './Alert.css';
import { StatusDot } from './StatusDot';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  /** `error` is the anomaly tone — only for failures, never for emphasis. */
  tone?: AlertTone;
  /** Strong heading over a muted body, e.g. a verdict and its summary. */
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

const DOT_TONE: Record<
  AlertTone,
  'warning' | 'inverted' | 'muted' | 'success'
> = {
  info: 'inverted',
  success: 'success',
  warning: 'muted',
  error: 'warning',
};

export function Alert({
  tone = 'info',
  title,
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
      {title === undefined ? (
        <>
          <StatusDot tone={DOT_TONE[tone]} size={6} />
          <span className="aegis-alert__body">{children}</span>
        </>
      ) : (
        <>
          <span className="aegis-alert__marker">
            <StatusDot tone={DOT_TONE[tone]} size={6} />
          </span>
          <div className="aegis-alert__content">
            <span className="aegis-alert__title">{title}</span>
            <span className="aegis-alert__body">{children}</span>
          </div>
        </>
      )}
    </div>
  );
}
