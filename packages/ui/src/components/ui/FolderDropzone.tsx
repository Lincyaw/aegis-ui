import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import { useDropzone } from 'react-dropzone';

import { formatBytes } from '../../lib/format';
import { type AegisStrings, useStrings } from '../../locale';
import { Button } from './Button';
import './FolderDropzone.css';
import { filesFromEvent } from './dropFiles';

export interface FolderDropzoneProps {
  /** Currently-selected files; the component is controlled. */
  value: File[];
  /**
   * Called with the files of a picked or dropped folder (or picked files).
   * Each file of a folder carries its path inside the dropped or picked
   * folder in `webkitRelativePath`, e.g. `site/docs/intro.md`.
   */
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
  /**
   * Slot rendered below the drop area, e.g. a per-file summary list. Its
   * text is set in the UI face with tabular figures; wrap paths in
   * `MonoValue`.
   */
  summary?: ReactNode;
  className?: string;
}

type SelectionError =
  | { kind: 'tooMany'; count: number; max: number }
  | { kind: 'fileTooLarge'; name: string; size: number; max: number }
  | { kind: 'totalTooLarge'; total: number; max: number };

function selectionErrorText(
  error: SelectionError,
  strings: AegisStrings,
): string {
  switch (error.kind) {
    case 'tooMany':
      return strings.folderDropzoneTooMany(error.count, error.max);
    case 'fileTooLarge':
      return strings.folderDropzoneFileTooLarge(
        error.name,
        formatBytes(error.size),
        formatBytes(error.max),
      );
    case 'totalTooLarge':
      return strings.folderDropzoneTotalTooLarge(
        formatBytes(error.total),
        formatBytes(error.max),
      );
  }
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
  const strings = useStrings();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalError, setInternalError] = useState<SelectionError | null>(
    null,
  );

  const applyFiles = useCallback(
    (incoming: File[]) => {
      if (disabled) {
        return;
      }
      if (incoming.length === 0) {
        return;
      }
      if (maxFiles !== undefined && incoming.length > maxFiles) {
        setInternalError({
          kind: 'tooMany',
          count: incoming.length,
          max: maxFiles,
        });
        return;
      }
      if (maxFileBytes !== undefined) {
        const offender = incoming.find((f) => f.size > maxFileBytes);
        if (offender) {
          setInternalError({
            kind: 'fileTooLarge',
            name: offender.name,
            size: offender.size,
            max: maxFileBytes,
          });
          return;
        }
      }
      if (maxTotalBytes !== undefined) {
        const total = incoming.reduce((acc, f) => acc + f.size, 0);
        if (total > maxTotalBytes) {
          setInternalError({
            kind: 'totalTooLarge',
            total,
            max: maxTotalBytes,
          });
          return;
        }
      }
      setInternalError(null);
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
    setInternalError(null);
    onFilesChange([]);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, onFilesChange]);

  const { getRootProps, isDragActive: dragActive } = useDropzone({
    onDrop: applyFiles,
    disabled,
    noClick: true,
    noKeyboard: true,
    getFilesFromEvent: filesFromEvent,
  });

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list) {
        applyFiles(Array.from(list));
      }
    },
    [applyFiles],
  );

  const errorMessage =
    validationError ??
    (internalError ? selectionErrorText(internalError, strings) : '');
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
      <div {...getRootProps({ className: surfaceClass })}>
        <div className="aegis-folder-dropzone__hint">
          <span className="aegis-folder-dropzone__primary">
            {dragActive
              ? strings.dropzoneDropFolder
              : hasFiles
                ? strings.folderDropzoneSelected(
                    value.length,
                    formatBytes(totalBytes),
                  )
                : strings.folderDropzoneHint}
          </span>
          {!hasFiles && helperText !== undefined ? (
            <span className="aegis-folder-dropzone__meta">{helperText}</span>
          ) : null}
        </div>
        <div className="aegis-folder-dropzone__actions">
          <Button
            tone="secondary"
            onClick={handlePickFolder}
            disabled={disabled}
          >
            {strings.chooseFolder}
          </Button>
          <Button
            tone="secondary"
            onClick={handlePickFiles}
            disabled={disabled}
          >
            {strings.chooseFiles}
          </Button>
          {hasFiles ? (
            <Button tone="ghost" onClick={handleClear} disabled={disabled}>
              {strings.clear}
            </Button>
          ) : null}
        </div>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          // @ts-expect-error -- non-standard but supported in Chromium/WebKit
          webkitdirectory=""
          className="aegis-folder-dropzone__input"
          onChange={handleInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          className="aegis-folder-dropzone__input"
          onChange={handleInputChange}
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
