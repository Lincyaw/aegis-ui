import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { formatBytes } from '../../lib/format';
import { useStrings } from '../../locale';
import './FilePreview.css';

export type FilePreviewSurface = PrimitiveSurface<{
  src: string;
  mimeType?: string;
  name?: string;
  size?: number;
}>;

interface FilePreviewProps {
  /** URL the browser can load the file from, as for `<img src>`. */
  src: string;
  /**
   * MIME type, parameters allowed (`application/json; charset=utf-8`);
   * chooses the renderer. Unknown ⇒ binary fallback.
   */
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

/**
 * Reads at most `limit` bytes of the body and cancels the rest, so a large
 * file is not downloaded to show its first lines.
 */
async function readTextPrefix(res: Response, limit: number): Promise<string> {
  if (!res.body) {
    return (await res.blob()).slice(0, limit).text();
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let read = 0;
  while (read < limit) {
    const { done, value } = await reader.read();
    if (done) {
      return text + decoder.decode();
    }
    const chunk = value.subarray(0, limit - read);
    read += chunk.byteLength;
    text += decoder.decode(chunk, { stream: true });
  }
  await reader.cancel();
  return text + decoder.decode();
}

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
  const strings = useStrings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { src, mimeType, name, size },
    'preview',
    wrapRef,
  );
  const kind = classify(mimeType);
  const rootClass = ['aegis-file-preview', className ?? '']
    .filter(Boolean)
    .join(' ');
  const rootStyle = {
    '--aegis-file-preview-max-height':
      typeof maxHeight === 'number' ? `${String(maxHeight)}px` : maxHeight,
    ...style,
  } as CSSProperties;

  return (
    <div ref={wrapRef} className={rootClass} style={rootStyle} {...agentAttrs}>
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
          title={name ?? strings.pdfPreview}
        />
      ) : kind === 'text' ? (
        // Keyed so a new file starts from a clean loading state.
        <TextPreview key={src} src={src} />
      ) : (
        <BinaryFallback name={name} size={size} src={src} fallback={fallback} />
      )}
    </div>
  );
}

function TextPreview({ src }: { src: string }) {
  const strings = useStrings();
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
        setBody(await readTextPrefix(res, TEXT_FETCH_LIMIT));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      ac.abort();
    };
  }, [src]);

  if (err !== null) {
    return (
      <div className="aegis-file-preview__error">
        {strings.filePreviewFailed(err)}
      </div>
    );
  }
  if (body === null) {
    return (
      <div className="aegis-file-preview__loading">
        {strings.filePreviewLoading}
      </div>
    );
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
  const strings = useStrings();
  if (fallback !== undefined) {
    return <div className="aegis-file-preview__fallback">{fallback}</div>;
  }
  return (
    <div className="aegis-file-preview__fallback">
      <span className="aegis-file-preview__fallback-name">
        {name ?? strings.binaryFile}
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
        {strings.download}
      </a>
    </div>
  );
}

type Kind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'binary';

function classify(mime: string | undefined): Kind {
  if (!mime) {
    return 'binary';
  }
  const m = mime.split(';')[0].trim().toLowerCase();
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
    m === 'application/x-sh' ||
    m.endsWith('+json') ||
    m.endsWith('+xml')
  ) {
    return 'text';
  }
  return 'binary';
}
