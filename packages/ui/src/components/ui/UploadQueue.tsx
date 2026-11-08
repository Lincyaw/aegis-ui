import { formatBytes, formatDurationEstimate } from '../../lib/format';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './UploadQueue.css';

export interface UploadQueueItem {
  /** Stable id so progress / errors can update in place. */
  id: string;
  file: File;
  /** Fraction uploaded, 0–1; omit while it is unknown. */
  progress?: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
  /** Bytes transferred so far. */
  bytesUploaded?: number;
  /** Transfer speed in bytes per second. */
  speedBps?: number;
  /** Estimated seconds remaining. */
  etaSeconds?: number;
  /** Called when the user cancels an in-progress upload. */
  onCancel?: () => void;
}

interface UploadQueueProps {
  items: UploadQueueItem[];
  /** Retry one failed item. */
  onRetry?: (id: string) => void;
  /** Drop a finished/failed item from the queue. */
  onDismiss?: (id: string) => void;
  /** Clear every done/error row at once. */
  onClearCompleted?: () => void;
  className?: string;
}

function humanSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

const STATUS_LABEL: Record<UploadQueueItem['status'], string> = {
  queued: 'queued',
  uploading: 'uploading',
  done: 'done',
  error: 'failed',
};

export function UploadQueue({
  items,
  onRetry,
  onDismiss,
  onClearCompleted,
  className,
}: UploadQueueProps) {
  const cls = ['aegis-upload-queue', className ?? ''].filter(Boolean).join(' ');
  const hasCompleted = items.some(
    (i) => i.status === 'done' || i.status === 'error',
  );

  if (items.length === 0) {
    return (
      <div className={cls}>
        <EmptyState
          title="No uploads"
          description="Drop files into the dropzone to start an upload."
        />
      </div>
    );
  }

  const doneCount = items.filter((i) => i.status === 'done').length;
  const totalBytes = items.reduce((acc, i) => acc + i.file.size, 0);
  const uploadedBytes = items.reduce(
    (acc, i) =>
      acc + (i.status === 'done' ? i.file.size : (i.bytesUploaded ?? 0)),
    0,
  );
  const maxEta = items
    .filter((i) => i.status === 'uploading' && i.etaSeconds !== undefined)
    .reduce<number>((acc, i) => Math.max(acc, i.etaSeconds ?? 0), 0);

  return (
    <div className={cls}>
      <header className="aegis-upload-queue__head">
        <div className="aegis-upload-queue__summary">
          <div className="aegis-upload-queue__summary-line">
            <span className="aegis-upload-queue__piece aegis-upload-queue__figures aegis-upload-queue__figures--muted">
              {doneCount.toString()}/{items.length.toString()} done
            </span>
            <span className="aegis-upload-queue__piece aegis-upload-queue__figures">
              {formatBytes(uploadedBytes)}/{formatBytes(totalBytes)}
            </span>
            {maxEta > 0 ? (
              <span className="aegis-upload-queue__piece aegis-upload-queue__figures">
                ETA {formatDurationEstimate(maxEta * 1000)}
              </span>
            ) : null}
          </div>
        </div>
        {hasCompleted && onClearCompleted ? (
          <Button tone="ghost" onClick={onClearCompleted}>
            Clear completed
          </Button>
        ) : null}
      </header>
      <ul className="aegis-upload-queue__list">
        {items.map((it) => (
          <li
            key={it.id}
            className={`aegis-upload-queue__item aegis-upload-queue__item--${it.status}`}
          >
            <div className="aegis-upload-queue__row">
              <span className="aegis-upload-queue__name">
                <MonoValue size="sm">{it.file.name}</MonoValue>
              </span>
              <span className="aegis-upload-queue__meta">
                {it.status === 'uploading' &&
                (it.speedBps !== undefined || it.etaSeconds !== undefined) ? (
                  <span className="aegis-upload-queue__figures">
                    {it.speedBps !== undefined ? humanSpeed(it.speedBps) : null}
                    {it.speedBps !== undefined && it.etaSeconds !== undefined
                      ? ' · '
                      : null}
                    {it.etaSeconds !== undefined
                      ? `ETA ${formatDurationEstimate(it.etaSeconds * 1000)}`
                      : null}
                  </span>
                ) : null}
                <span className="aegis-upload-queue__figures aegis-upload-queue__figures--muted">
                  {formatBytes(it.file.size)}
                </span>
                <MetricLabel>{STATUS_LABEL[it.status]}</MetricLabel>
                {it.status === 'uploading' && it.onCancel !== undefined ? (
                  <Button
                    tone="ghost"
                    onClick={it.onCancel}
                    aria-label="Cancel upload"
                  >
                    Cancel
                  </Button>
                ) : null}
              </span>
            </div>
            <div className="aegis-upload-queue__bar">
              <div
                className="aegis-upload-queue__bar-fill"
                style={{
                  width: `${(it.status === 'done' ? 100 : it.progress !== undefined ? it.progress * 100 : 0).toString()}%`,
                }}
              />
            </div>
            {it.status === 'error' ? (
              <div className="aegis-upload-queue__error">
                <MetricLabel>{it.error ?? 'upload failed'}</MetricLabel>
                <span className="aegis-upload-queue__actions">
                  {onRetry ? (
                    <Button
                      tone="ghost"
                      onClick={() => {
                        onRetry(it.id);
                      }}
                    >
                      Retry
                    </Button>
                  ) : null}
                  {onDismiss ? (
                    <Button
                      tone="ghost"
                      onClick={() => {
                        onDismiss(it.id);
                      }}
                    >
                      Dismiss
                    </Button>
                  ) : null}
                </span>
              </div>
            ) : null}
            {it.status === 'done' && onDismiss ? (
              <div className="aegis-upload-queue__actions">
                <Button
                  tone="ghost"
                  onClick={() => {
                    onDismiss(it.id);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
