import type { ReactNode } from 'react';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStrings } from '../../locale';
import { CopyGlyph } from './CopyGlyph';
import './MetadataList.css';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';

export interface MetadataEntry {
  label: string;
  value: ReactNode;
  /** Render value in MonoValue instead of default text. */
  mono?: boolean;
  /** Show a hover copy-to-clipboard button on the value. */
  copyable?: boolean;
}

export interface MetadataListProps {
  entries: MetadataEntry[];
  /**
   * Wrap long values onto further lines instead of cutting them off with an
   * ellipsis. Line breaks in a string value are kept, and mono values break
   * at any character.
   */
  wrap?: boolean;
  className?: string;
}

function CopyButton({ text }: { text: string }): ReactNode {
  const { copied, copy } = useCopyToClipboard(1500);
  const strings = useStrings();

  const handleCopy = (): void => {
    void copy(text);
  };

  return (
    <button
      type="button"
      className={
        copied
          ? 'aegis-metadata-list__copy aegis-metadata-list__copy--copied'
          : 'aegis-metadata-list__copy'
      }
      onClick={handleCopy}
      aria-label={strings.copyToClipboard}
      title={copied ? strings.copied : strings.copy}
    >
      <CopyGlyph copied={copied} />
    </button>
  );
}

export function MetadataList({
  entries,
  wrap = false,
  className,
}: MetadataListProps) {
  const cls = [
    'aegis-metadata-list',
    wrap ? 'aegis-metadata-list--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <dl className={cls}>
      {entries.map((entry, idx) => (
        <div key={idx} className="aegis-metadata-list__row">
          <dt className="aegis-metadata-list__label">
            <MetricLabel>{entry.label}</MetricLabel>
          </dt>
          <dd className="aegis-metadata-list__value">
            {entry.mono ? (
              <MonoValue size="sm" wrap={wrap}>
                {entry.value}
              </MonoValue>
            ) : (
              <span className="aegis-metadata-list__text">{entry.value}</span>
            )}
            {entry.copyable && typeof entry.value === 'string' ? (
              <CopyButton text={entry.value} />
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
