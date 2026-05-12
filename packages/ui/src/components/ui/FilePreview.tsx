import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './FilePreview.css';

export interface FilePreviewSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    src: string;
    mimeType?: string;
    name?: string;
    size?: number;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface FilePreviewProps {
  /** Public URL or signed `/blob/raw/:token` link. */
  src: string;
  /** MIME type; chooses the renderer. Unknown ⇒ binary fallback. */
  mimeType?: string;
  /** File display name (download fallback + tooltip). */
  name?: string;
  /** Optional byte size (binary fallback uses this). */
  size?: number;
  /** Render slot when binary fallback fires (overrides default). */
  fallback?: ReactNode;
  /** Max height of preview viewport. */
  maxHeight?: number | string;
  className?: string;
  style?: CSSProperties;
  surface?: FilePreviewSurface;
}

const TEXT_FETCH_LIMIT = 256 * 1024;

export function FilePreview({
  src,
  mimeType,
  name,
  size,
  fallback,
  maxHeight = 480,
  className,
  style,
  surface,
}: FilePreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<{
    src: string;
    mimeType?: string;
    name?: string;
    size?: number;
  }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'preview',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { src, mimeType, name, size },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const kind = classify(mimeType);
  const rootClass = ['aegis-file-preview', className ?? '']
    .filter(Boolean)
    .join(' ');
  const rootStyle: CSSProperties = { maxHeight, ...style };

  return (
    <div
      ref={wrapRef}
      className={rootClass}
      style={rootStyle}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {kind === 'image' ? (
        <img className="aegis-file-preview__image" src={src} alt={name ?? ''} />
      ) : kind === 'video' ? (
        // Preview surface for arbitrary uploads — captions are the producer's responsibility.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="aegis-file-preview__video" src={src} controls />
      ) : kind === 'audio' ? (
        // Same as <video> above.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio className="aegis-file-preview__audio" src={src} controls />
      ) : kind === 'pdf' ? (
        <iframe
          className="aegis-file-preview__iframe"
          src={src}
          title={name ?? 'pdf preview'}
        />
      ) : kind === 'text' ? (
        <TextPreview src={src} />
      ) : (
        <BinaryFallback name={name} size={size} src={src} fallback={fallback} />
      )}
    </div>
  );
}

function TextPreview({ src }: { src: string }) {
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(src, { signal: ac.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status.toString()}`);
        }
        const blob = await res.blob();
        const slice = blob.slice(0, TEXT_FETCH_LIMIT);
        const text = await slice.text();
        setBody(text);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        setErr(e instanceof Error ? e.message : 'load failed');
      }
    })();
    return () => {
      ac.abort();
    };
  }, [src]);

  if (err !== null) {
    return (
      <div className="aegis-file-preview__error">preview failed: {err}</div>
    );
  }
  if (body === null) {
    return <div className="aegis-file-preview__loading">loading…</div>;
  }
  return <pre className="aegis-file-preview__text">{body}</pre>;
}

interface BinaryFallbackProps {
  src: string;
  name?: string;
  size?: number;
  fallback?: ReactNode;
}

function BinaryFallback({ src, name, size, fallback }: BinaryFallbackProps) {
  if (fallback !== undefined) {
    return <div className="aegis-file-preview__fallback">{fallback}</div>;
  }
  return (
    <div className="aegis-file-preview__fallback">
      <span className="aegis-file-preview__fallback-name">
        {name ?? 'binary file'}
      </span>
      {size !== undefined ? (
        <span className="aegis-file-preview__fallback-meta">
          {formatBytes(size)}
        </span>
      ) : null}
      <a
        className="aegis-file-preview__fallback-download"
        href={src}
        download={name ?? true}
      >
        Download
      </a>
    </div>
  );
}

type Kind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'binary';

function classify(mime: string | undefined): Kind {
  if (!mime) {
    return 'binary';
  }
  const m = mime.toLowerCase();
  if (m.startsWith('image/')) {
    return 'image';
  }
  if (m.startsWith('video/')) {
    return 'video';
  }
  if (m.startsWith('audio/')) {
    return 'audio';
  }
  if (m === 'application/pdf') {
    return 'pdf';
  }
  if (
    m.startsWith('text/') ||
    m === 'application/json' ||
    m === 'application/xml' ||
    m === 'application/yaml' ||
    m === 'application/x-yaml' ||
    m === 'application/javascript' ||
    m === 'application/x-sh'
  ) {
    return 'text';
  }
  return 'binary';
}

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  if (n < 1024 * 1024 * 1024) {
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default FilePreview;
