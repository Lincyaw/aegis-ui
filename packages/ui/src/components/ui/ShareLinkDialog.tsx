import { useCallback, useEffect, useMemo, useState } from 'react';

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

interface ShareLinkDialogProps {
  /** Object key being shared — displayed at the top for context. */
  objectKey: string;
  /** Available TTL presets shown as chips. */
  ttlPresets?: Array<{ label: string; seconds: number }>;
  /** Asked when user clicks "Generate". Resolves to URL + expires. */
  onGenerate: (opts: ShareLinkOptions) => Promise<ShareLinkResult>;
  /** Optional cancel/close handler — renders a secondary button. */
  onClose?: () => void;
  className?: string;
}

const DEFAULT_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '1 hr', seconds: 60 * 60 },
  { label: '1 day', seconds: 24 * 60 * 60 },
  { label: '7 days', seconds: 7 * 24 * 60 * 60 },
];

function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return 'expired';
  }
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h.toString()}h ${m.toString()}m`;
  }
  if (m > 0) {
    return `${m.toString()}m ${sec.toString()}s`;
  }
  return `${sec.toString()}s`;
}

export function ShareLinkDialog({
  objectKey,
  ttlPresets = DEFAULT_PRESETS,
  onGenerate,
  onClose,
  className,
}: ShareLinkDialogProps) {
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
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

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

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setCopied(false);
    try {
      const r = await onGenerate({ ttlSeconds: ttl, asAttachment });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to generate link');
    } finally {
      setGenerating(false);
    }
  }, [asAttachment, onGenerate, ttl]);

  const handleCopy = useCallback(async () => {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError('clipboard unavailable');
    }
  }, [result]);

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
        <MetricLabel>Sharing</MetricLabel>
        <MonoValue size="sm">{objectKey}</MonoValue>
      </header>

      <div className="aegis-share-link__row">
        <MetricLabel>Expires after</MetricLabel>
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
        <MetricLabel>Disposition</MetricLabel>
        <label className="aegis-share-link__toggle">
          <input
            type="checkbox"
            checked={asAttachment}
            onChange={(e) => {
              setAsAttachment(e.target.checked);
              setResult(null);
            }}
          />
          <span>Force download (attachment)</span>
        </label>
      </div>

      {error !== null ? (
        <div className="aegis-share-link__error">
          <MetricLabel>{error}</MetricLabel>
        </div>
      ) : null}

      {result ? (
        <div className="aegis-share-link__result">
          <div className="aegis-share-link__url">
            <MonoValue size="sm">{result.url}</MonoValue>
          </div>
          <div className="aegis-share-link__meta">
            <Chip tone="ghost">expires in {formatCountdown(remainingMs)}</Chip>
            {copied ? <Chip tone="ghost">copied</Chip> : null}
          </div>
        </div>
      ) : null}

      <footer className="aegis-share-link__actions">
        {onClose ? (
          <Button onClick={onClose} tone="ghost">
            Close
          </Button>
        ) : null}
        {result ? (
          <Button
            onClick={() => {
              void handleCopy();
            }}
          >
            Copy link
          </Button>
        ) : (
          <Button
            onClick={() => {
              void handleGenerate();
            }}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate link'}
          </Button>
        )}
      </footer>
    </div>
  );
}

export default ShareLinkDialog;
