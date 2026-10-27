import { type ReactNode } from 'react';

import './Alert.css';
import { StatusDot } from './StatusDot';

type AlertTone = 'info' | 'warning' | 'error';

interface AlertProps {
  /** `error` is the anomaly tone — only for failures, never for emphasis. */
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

const DOT_TONE: Record<AlertTone, 'warning' | 'inverted' | 'muted'> = {
  info: 'inverted',
  warning: 'muted',
  error: 'warning',
};

export function Alert({ tone = 'info', children, className }: AlertProps) {
  const cls = ['aegis-alert', `aegis-alert--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} role="status">
      <StatusDot tone={DOT_TONE[tone]} size={6} />
      <span className="aegis-alert__body">{children}</span>
    </div>
  );
}
