import { Button } from './Button';
import { EmptyState } from './EmptyState';
import type { FileDropzoneItem } from './FileDropzone';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './UploadQueue.css';

interface UploadQueueProps {
  items: FileDropzoneItem[];
  /** Retry one failed item. */
  onRetry?: (id: string) => void;
  /** Drop a finished/failed item from the queue. */
  onDismiss?: (id: string) => void;
  /** Clear every done/error row at once. */
  onClearCompleted?: () => void;
  className?: string;
}

function humanBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  if (n < 1024 * 1024 * 1024) {
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function humanSpeed(bps: number): string {
  return `${humanBytes(bps)}/s`;
}

function humanEta(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds).toString()}s`;
  }
  return `${Math.round(seconds / 60).toString()}m`;
}

const STATUS_LABEL: Record<FileDropzoneItem['status'], string> = {
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
          <MetricLabel>
            {doneCount.toString()}/{items.length.toString()} done
          </MetricLabel>
          <MetricLabel>·</MetricLabel>
          <MonoValue size="sm">
            {humanBytes(uploadedBytes)}/{humanBytes(totalBytes)}
          </MonoValue>
          {maxEta > 0 ? (
            <>
              <MetricLabel>·</MetricLabel>
              <MonoValue size="sm">ETA {humanEta(maxEta)}</MonoValue>
            </>
          ) : null}
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
                  <MonoValue size="sm" weight="regular">
                    {it.speedBps !== undefined ? humanSpeed(it.speedBps) : null}
                    {it.speedBps !== undefined && it.etaSeconds !== undefined
                      ? ' · '
                      : null}
                    {it.etaSeconds !== undefined
                      ? `ETA ${humanEta(it.etaSeconds)}`
                      : null}
                  </MonoValue>
                ) : null}
                <MetricLabel>{humanBytes(it.file.size)}</MetricLabel>
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

export default UploadQueue;
