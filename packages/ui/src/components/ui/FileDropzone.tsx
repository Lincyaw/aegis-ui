import type { CSSProperties, ReactNode } from 'react';

import { type Accept, useDropzone } from 'react-dropzone';

import { formatBytes } from '../../lib/format';
import { useStrings } from '../../locale';
import './FileDropzone.css';
import { filesFromEvent } from './dropFiles';

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
   * an entire folder. Files of a picked or dropped folder carry their path
   * inside it in `webkitRelativePath`.
   */
  directory?: boolean;
  /**
   * `'inline'` (default) — standard dashed-border dropzone block.
   * `'overlay'` — fixed/absolute fullscreen overlay with a dashed border and
   *   centred hint; use inside a `position: relative` container.
   */
  variant?: 'inline' | 'overlay';
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
  hint,
  className,
  style,
}: FileDropzoneProps) {
  const strings = useStrings();
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      multiple,
      disabled,
      maxSize,
      getFilesFromEvent: filesFromEvent,
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
          {...(directory ? { webkitdirectory: '', mozdirectory: '' } : {})}
        />
        <div className="aegis-file-dropzone__hint">
          {hint ?? (
            <>
              <span className="aegis-file-dropzone__primary">
                {isDragActive
                  ? directory
                    ? strings.dropzoneDropFolder
                    : strings.dropzoneDropFiles
                  : directory
                    ? strings.dropzoneBrowseFolder
                    : strings.dropzoneBrowseFiles}
              </span>
              {accept ? (
                <span className="aegis-file-dropzone__meta">
                  {Object.keys(accept).join(', ')}
                </span>
              ) : null}
              {maxSize !== undefined ? (
                <span className="aegis-file-dropzone__meta aegis-file-dropzone__meta--size">
                  {strings.dropzoneMaxSize(formatBytes(maxSize))}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
