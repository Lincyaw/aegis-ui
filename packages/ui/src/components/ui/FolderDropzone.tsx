import {
  type DragEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import './FolderDropzone.css';

export interface FolderDropzoneProps {
  /** Currently-selected files; the component is controlled. */
  value: File[];
  onFilesChange: (files: File[]) => void;
  /** Per-file ceiling (bytes). Files larger than this are rejected. */
  maxFileBytes?: number;
  /** Aggregate ceiling (bytes). Selections totalling more are rejected. */
  maxTotalBytes?: number;
  /** Hard cap on file count. */
  maxFiles?: number;
  /** `accept` attribute forwarded to the underlying `<input>`. */
  accept?: string;
  disabled?: boolean;
  /** Text shown beneath the drop area. */
  helperText?: ReactNode;
  /** External validation message; rendered in error tone when present. */
  validationError?: string;
  /** Slot rendered below the drop area, e.g. a per-file summary list. */
  summary?: ReactNode;
  className?: string;
}

export function FolderDropzone({
  value,
  onFilesChange,
  maxFileBytes,
  maxTotalBytes,
  maxFiles,
  accept,
  disabled = false,
  helperText,
  validationError,
  summary,
  className,
}: FolderDropzoneProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [internalError, setInternalError] = useState<string>('');

  const applyFiles = useCallback(
    (incoming: File[]) => {
      if (disabled) {
        return;
      }
      if (incoming.length === 0) {
        return;
      }
      if (maxFiles !== undefined && incoming.length > maxFiles) {
        setInternalError(
          `Too many files: ${incoming.length.toString()} selected, ${maxFiles.toString()} allowed.`,
        );
        return;
      }
      if (maxFileBytes !== undefined) {
        const offender = incoming.find((f) => f.size > maxFileBytes);
        if (offender) {
          setInternalError(
            `"${offender.name}" is ${formatBytes(offender.size)}, over the ${formatBytes(maxFileBytes)} per-file cap.`,
          );
          return;
        }
      }
      if (maxTotalBytes !== undefined) {
        const total = incoming.reduce((acc, f) => acc + f.size, 0);
        if (total > maxTotalBytes) {
          setInternalError(
            `Selection totals ${formatBytes(total)}, over the ${formatBytes(maxTotalBytes)} aggregate cap.`,
          );
          return;
        }
      }
      setInternalError('');
      onFilesChange(incoming);
    },
    [disabled, maxFiles, maxFileBytes, maxTotalBytes, onFilesChange],
  );

  const handlePickFolder = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    if (disabled) {
      return;
    }
    setInternalError('');
    onFilesChange([]);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, onFilesChange]);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDragActive(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (disabled) {
        return;
      }
      const dropped = Array.from(event.dataTransfer.files);
      applyFiles(dropped);
    },
    [disabled, applyFiles],
  );

  const handleFolderInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list) {
        applyFiles(Array.from(list));
      }
    },
    [applyFiles],
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list) {
        applyFiles(Array.from(list));
      }
    },
    [applyFiles],
  );

  const errorMessage = validationError ?? internalError;
  const hasFiles = value.length > 0;
  const totalBytes = value.reduce((acc, f) => acc + f.size, 0);

  const surfaceClass = [
    'aegis-folder-dropzone__surface',
    dragActive ? 'aegis-folder-dropzone__surface--active' : '',
    disabled ? 'aegis-folder-dropzone__surface--disabled' : '',
    errorMessage ? 'aegis-folder-dropzone__surface--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rootClass = ['aegis-folder-dropzone', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div
        className={surfaceClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="aegis-folder-dropzone__hint">
          <span className="aegis-folder-dropzone__primary">
            {dragActive
              ? 'Drop folder to upload'
              : hasFiles
                ? `${value.length.toString()} file${value.length === 1 ? '' : 's'} selected · ${formatBytes(totalBytes)}`
                : 'Drag a folder here, or choose one below'}
          </span>
          {!hasFiles && helperText !== undefined ? (
            <span className="aegis-folder-dropzone__meta">{helperText}</span>
          ) : null}
        </div>
        <div className="aegis-folder-dropzone__actions">
          <button
            type="button"
            className="aegis-folder-dropzone__action"
            onClick={handlePickFolder}
            disabled={disabled}
          >
            Choose folder
          </button>
          <button
            type="button"
            className="aegis-folder-dropzone__action"
            onClick={handlePickFiles}
            disabled={disabled}
          >
            Choose files
          </button>
          {hasFiles ? (
            <button
              type="button"
              className="aegis-folder-dropzone__action aegis-folder-dropzone__action--quiet"
              onClick={handleClear}
              disabled={disabled}
            >
              Clear
            </button>
          ) : null}
        </div>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          // @ts-expect-error -- non-standard but supported in Chromium/WebKit
          webkitdirectory=""
          className="aegis-folder-dropzone__input"
          onChange={handleFolderInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          className="aegis-folder-dropzone__input"
          onChange={handleFileInputChange}
        />
      </div>
      {summary !== undefined && hasFiles ? (
        <div className="aegis-folder-dropzone__summary">{summary}</div>
      ) : null}
      {errorMessage ? (
        <div className="aegis-folder-dropzone__error" role="alert">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(n: number): string {
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

export default FolderDropzone;
