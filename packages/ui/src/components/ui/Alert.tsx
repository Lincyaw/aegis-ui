import { type ReactNode } from 'react';

import './Alert.css';
import { StatusDot } from './StatusDot';

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
  const marker =
    icon === undefined ? (
      <StatusDot tone={DOT_TONE[tone]} size={6} />
    ) : (
      <span className="aegis-alert__icon">{icon}</span>
    );
  return (
    <div className={cls} role="status">
      {title === undefined ? (
        <>
          {marker}
          <span className="aegis-alert__body">{children}</span>
        </>
      ) : (
        <>
          <span className="aegis-alert__marker">{marker}</span>
          <div className="aegis-alert__content">
            <span className="aegis-alert__title">{title}</span>
            <span className="aegis-alert__body">{children}</span>
          </div>
        </>
      )}
    </div>
  );
}
