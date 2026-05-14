import { type KeyboardEvent, type ReactNode } from 'react';

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
  onClick?: () => void;
  className?: string;
}

function humanBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i] ?? ''}`;
}

export function BucketCard({
  name,
  driver,
  maxObjectBytes,
  retentionDays,
  publicRead = false,
  objectCount,
  totalBytes,
  onClick,
  className,
}: BucketCardProps) {
  const interactive = Boolean(onClick);
  const cls = [
    'aegis-bucket-card',
    interactive ? 'aegis-bucket-card--clickable' : '',
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
              <MetricLabel>public</MetricLabel>
            </span>
          ) : null}
        </div>
      </div>
      <div className="aegis-bucket-card__grid">
        <div className="aegis-bucket-card__stat">
          <MetricLabel>Max object</MetricLabel>
          <MonoValue size="sm">
            {maxObjectBytes && maxObjectBytes > 0
              ? humanBytes(maxObjectBytes)
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
            {totalBytes !== undefined ? humanBytes(totalBytes) : '—'}
          </MonoValue>
        </div>
      </div>
    </div>
  );
}

export default BucketCard;
