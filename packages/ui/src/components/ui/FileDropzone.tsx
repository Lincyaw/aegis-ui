import type { CSSProperties, ReactNode } from 'react';

import { type Accept, useDropzone } from 'react-dropzone';

import './FileDropzone.css';

export interface FileDropzoneItem {
  /** Stable id so progress / errors can update in place. */
  id: string;
  file: File;
  /** 0–100; omit for indeterminate. */
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

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
  /** Accept map per react-dropzone, e.g. `{ 'image/*': ['.png'] }`. */
  accept?: Accept;
  multiple?: boolean;
  disabled?: boolean;
  /** Reject files bigger than this many bytes (forwarded to react-dropzone). */
  maxSize?: number;
  /**
   * When true, the `<input>` gets `webkitdirectory` so the user can select
   * an entire folder.  Each `File` carries its `webkitRelativePath`.
   */
  directory?: boolean;
  /**
   * `'inline'` (default) — standard dashed-border dropzone block.
   * `'overlay'` — fixed/absolute fullscreen overlay with a dashed border and
   *   centred hint; use inside a `position: relative` container.
   */
  variant?: 'inline' | 'overlay';
  /** Optional in-flight queue rendered under the drop area. */
  items?: FileDropzoneItem[];
  /** Override the body text in the drop area. */
  hint?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function FileDropzone({
  onDrop,
  accept,
  multiple = true,
  disabled = false,
  maxSize,
  directory = false,
  variant = 'inline',
  items,
  hint,
  className,
  style,
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      multiple,
      disabled,
      maxSize,
    });

  const isOverlay = variant === 'overlay';

  const rootClass = [
    'aegis-file-dropzone',
    isOverlay ? 'aegis-file-dropzone--overlay' : '',
    isDragActive ? 'aegis-file-dropzone--active' : '',
    isDragReject ? 'aegis-file-dropzone--reject' : '',
    disabled ? 'aegis-file-dropzone--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputProps = getInputProps();

  return (
    <div
      className={
        isOverlay
          ? 'aegis-file-dropzone__root aegis-file-dropzone__root--overlay'
          : 'aegis-file-dropzone__root'
      }
      style={style}
    >
      <div {...getRootProps({ className: rootClass })}>
        <input
          {...inputProps}
          /* eslint-disable-next-line react/no-unknown-property */
          {...(directory ? { webkitdirectory: '', mozdirectory: '' } : {})}
        />
        <div className="aegis-file-dropzone__hint">
          {hint ?? (
            <>
              <span className="aegis-file-dropzone__primary">
                {isDragActive
                  ? directory
                    ? 'Drop folder to upload'
                    : 'Drop to upload'
                  : directory
                    ? 'Drag a folder here or click to browse'
                    : 'Drag files here or click to browse'}
              </span>
              {accept ? (
                <span className="aegis-file-dropzone__meta">
                  {Object.keys(accept).join(', ')}
                </span>
              ) : null}
              {maxSize !== undefined ? (
                <span className="aegis-file-dropzone__meta">
                  max {formatBytes(maxSize)}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
      {items && items.length > 0 ? (
        <ul className="aegis-file-dropzone__queue">
          {items.map((it) => (
            <li
              key={it.id}
              className={`aegis-file-dropzone__queue-item aegis-file-dropzone__queue-item--${it.status}`}
            >
              <div className="aegis-file-dropzone__queue-row">
                <span className="aegis-file-dropzone__queue-name">
                  {it.file.name}
                </span>
                <span className="aegis-file-dropzone__queue-meta">
                  {it.status === 'error'
                    ? (it.error ?? 'failed')
                    : it.status === 'done'
                      ? 'done'
                      : it.progress !== undefined
                        ? `${it.progress.toString()}%`
                        : '…'}
                </span>
              </div>
              <div className="aegis-file-dropzone__bar">
                <div
                  className="aegis-file-dropzone__bar-fill"
                  style={{
                    width: `${(it.status === 'done' ? 100 : (it.progress ?? 0)).toString()}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default FileDropzone;
