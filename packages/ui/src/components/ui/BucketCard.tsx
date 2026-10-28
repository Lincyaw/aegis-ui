import { type KeyboardEvent, type ReactNode } from 'react';

import { formatBytes } from '../../lib/format';
import './BucketCard.css';
import { Chip } from './Chip';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';

interface BucketCardProps {
  name: ReactNode;
  /** Driver shown as a ghost chip (e.g. `s3`, `localfs`). */
  driver?: string;
  /** Max object size per bucket, in bytes. */
  maxObjectBytes?: number;
  /** Retention window in days; 0 / undefined = none. */
  retentionDays?: number;
  /** Surfaces an anomaly-red dot when true (public bucket = attention). */
  publicRead?: boolean;
  /** Optional object count / size summary shown on the right. */
  objectCount?: number;
  totalBytes?: number;
  /**
   * Row of quick-action buttons (e.g. settings icon button).
   * Revealed on hover via CSS.
   */
  quickActions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function BucketCard({
  name,
  driver,
  maxObjectBytes,
  retentionDays,
  publicRead = false,
  objectCount,
  totalBytes,
  quickActions,
  onClick,
  className,
}: BucketCardProps) {
  const interactive = Boolean(onClick);
  const cls = [
    'aegis-bucket-card',
    interactive ? 'aegis-bucket-card--clickable' : '',
    quickActions !== undefined ? 'aegis-bucket-card--has-actions' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!onClick) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={cls}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="aegis-bucket-card__head">
        <div className="aegis-bucket-card__title">
          <MonoValue size="lg">{name}</MonoValue>
        </div>
        <div className="aegis-bucket-card__chips">
          {driver ? <Chip tone="ghost">{driver}</Chip> : null}
          {publicRead ? (
            <span className="aegis-bucket-card__public" title="Public read">
              <StatusDot tone="warning" />
              <MetricLabel>Public</MetricLabel>
            </span>
          ) : null}
        </div>
      </div>
      <div className="aegis-bucket-card__grid">
        <div className="aegis-bucket-card__stat">
          <MetricLabel>Max object</MetricLabel>
          <MonoValue size="sm">
            {maxObjectBytes && maxObjectBytes > 0
              ? formatBytes(maxObjectBytes)
              : '∞'}
          </MonoValue>
        </div>
        <div className="aegis-bucket-card__stat">
          <MetricLabel>Retention</MetricLabel>
          <MonoValue size="sm">
            {retentionDays && retentionDays > 0
              ? `${retentionDays.toString()} d`
              : '∞'}
          </MonoValue>
        </div>
        <div className="aegis-bucket-card__stat">
          <MetricLabel>Objects</MetricLabel>
          <MonoValue size="sm">
            {objectCount !== undefined ? objectCount.toString() : '—'}
          </MonoValue>
        </div>
        <div className="aegis-bucket-card__stat">
          <MetricLabel>Used</MetricLabel>
          <MonoValue size="sm">
            {totalBytes !== undefined ? formatBytes(totalBytes) : '—'}
          </MonoValue>
        </div>
      </div>
      {quickActions !== undefined ? (
        <div className="aegis-bucket-card__quick-actions">{quickActions}</div>
      ) : null}
    </div>
  );
}
