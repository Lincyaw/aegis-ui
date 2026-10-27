import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStrings } from '../../locale';
import { Button } from './Button';
import { Chip } from './Chip';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './ShareLinkDialog.css';

export interface ShareLinkOptions {
  ttlSeconds: number;
  /** When true, response forces attachment download instead of inline render. */
  asAttachment: boolean;
}

export interface ShareLinkResult {
  url: string;
  expiresAt: string;
}

interface ShareLinkDialogBaseProps {
  /** Object key being shared — displayed at the top for context. */
  objectKey: string;
  /** Context under the object key, e.g. what the link opens and that it is read-only. */
  description?: ReactNode;
  /** Optional cancel/close handler — renders a secondary button. */
  onClose?: () => void;
  className?: string;
}

interface ExpiringShareLinkProps extends ShareLinkDialogBaseProps {
  /** Available TTL presets shown as chips. */
  ttlPresets?: Array<{ label: string; seconds: number }>;
  /** Asked when user clicks "Generate". Resolves to URL + expires. */
  onGenerate: (opts: ShareLinkOptions) => Promise<ShareLinkResult>;
  url?: undefined;
}

interface PlainShareLinkProps extends ShareLinkDialogBaseProps {
  /**
   * A link that does not expire, e.g. the current page. It is shown with a
   * copy button and no TTL presets, download toggle or countdown.
   */
  url: string;
  ttlPresets?: undefined;
  onGenerate?: undefined;
}

type ShareLinkDialogProps = ExpiringShareLinkProps | PlainShareLinkProps;

const DEFAULT_TTL_SECONDS = [15 * 60, 60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60];

function remainingParts(ms: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const s = Math.floor(ms / 1000);
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function ShareLinkDialog({
  objectKey,
  description,
  url: plainUrl,
  ttlPresets: ttlPresetsProp,
  onGenerate,
  onClose,
  className,
}: ShareLinkDialogProps) {
  const strings = useStrings();
  const ttlPresets =
    ttlPresetsProp ??
    DEFAULT_TTL_SECONDS.map((seconds) => ({
      label: strings.shareLinkTtl(seconds),
      seconds,
    }));
  const defaultTtl =
    ttlPresets.length > 1
      ? ttlPresets[1].seconds
      : ttlPresets.length > 0
        ? ttlPresets[0].seconds
        : 3600;
  const [ttl, setTtl] = useState<number>(defaultTtl);
  const [asAttachment, setAsAttachment] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ShareLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy, reset: resetCopied } = useCopyToClipboard(2000);
  const [now, setNow] = useState<number>(Date.now());
  const url = plainUrl ?? result?.url;

  useEffect(() => {
    if (!result) {
      return undefined;
    }
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [result]);

  const handleGenerate = useCallback(
    async (generate: (opts: ShareLinkOptions) => Promise<ShareLinkResult>) => {
      setGenerating(true);
      setError(null);
      resetCopied();
      try {
        const r = await generate({ ttlSeconds: ttl, asAttachment });
        setResult(r);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : strings.shareLinkGenerateFailed,
        );
      } finally {
        setGenerating(false);
      }
    },
    [asAttachment, ttl, resetCopied, strings],
  );

  const handleCopy = useCallback(async () => {
    if (url === undefined) {
      return;
    }
    if (!(await copy(url))) {
      setError(strings.clipboardUnavailable);
    }
  }, [url, copy, strings]);

  const cls = ['aegis-share-link', className ?? ''].filter(Boolean).join(' ');

  const remainingMs = useMemo(() => {
    if (!result) {
      return 0;
    }
    return new Date(result.expiresAt).getTime() - now;
  }, [result, now]);

  return (
    <div className={cls}>
      <header className="aegis-share-link__head">
        <MetricLabel>{strings.shareLinkSharing}</MetricLabel>
        <MonoValue size="sm">{objectKey}</MonoValue>
        {description !== undefined ? (
          <span className="aegis-share-link__description">{description}</span>
        ) : null}
      </header>

      {onGenerate === undefined ? null : (
        <>
          <div className="aegis-share-link__row">
            <MetricLabel>{strings.shareLinkExpiresAfter}</MetricLabel>
            <div className="aegis-share-link__ttl">
              {ttlPresets.map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  className={
                    p.seconds === ttl
                      ? 'aegis-share-link__ttl-pill aegis-share-link__ttl-pill--active'
                      : 'aegis-share-link__ttl-pill'
                  }
                  onClick={() => {
                    setTtl(p.seconds);
                    setResult(null);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aegis-share-link__row">
            <MetricLabel>{strings.shareLinkDisposition}</MetricLabel>
            <label className="aegis-share-link__toggle">
              <input
                type="checkbox"
                checked={asAttachment}
                onChange={(e) => {
                  setAsAttachment(e.target.checked);
                  setResult(null);
                }}
              />
              <span>{strings.shareLinkForceDownload}</span>
            </label>
          </div>
        </>
      )}

      {error !== null ? (
        <div className="aegis-share-link__error">
          <MetricLabel>{error}</MetricLabel>
        </div>
      ) : null}

      {url !== undefined ? (
        <div className="aegis-share-link__result">
          <div className="aegis-share-link__url">
            <MonoValue size="sm">{url}</MonoValue>
          </div>
          {result !== null || copied ? (
            <div className="aegis-share-link__meta">
              {result !== null ? (
                <Chip tone="ghost">
                  {remainingMs > 0
                    ? strings.shareLinkExpiresIn(remainingParts(remainingMs))
                    : strings.shareLinkExpired}
                </Chip>
              ) : null}
              {copied ? <Chip tone="ghost">{strings.copied}</Chip> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <footer className="aegis-share-link__actions">
        {onClose ? (
          <Button onClick={onClose} tone="ghost">
            {strings.close}
          </Button>
        ) : null}
        {url !== undefined || onGenerate === undefined ? (
          <Button
            onClick={() => {
              void handleCopy();
            }}
          >
            {strings.shareLinkCopy}
          </Button>
        ) : (
          <Button
            onClick={() => {
              void handleGenerate(onGenerate);
            }}
            disabled={generating}
          >
            {generating
              ? strings.shareLinkGenerating
              : strings.shareLinkGenerate}
          </Button>
        )}
      </footer>
    </div>
  );
}
