import { type ReactNode, useState } from 'react';

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
  className?: string;
}

function CopyButton({ text }: { text: string }): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  };

  return (
    <button
      type="button"
      className="aegis-metadata-list__copy"
      onClick={handleCopy}
      aria-label="Copy value"
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

export function MetadataList({ entries, className }: MetadataListProps) {
  const cls = ['aegis-metadata-list', className ?? '']
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
              <MonoValue size="sm">{entry.value}</MonoValue>
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

export default MetadataList;
