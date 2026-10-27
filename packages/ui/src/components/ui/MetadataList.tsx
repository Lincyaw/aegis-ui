import type { ReactNode } from 'react';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStrings } from '../../locale';
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
  const { copied, copy } = useCopyToClipboard(1500);
  const strings = useStrings();

  const handleCopy = (): void => {
    void copy(text);
  };

  return (
    <button
      type="button"
      className="aegis-metadata-list__copy"
      onClick={handleCopy}
      aria-label={strings.copyToClipboard}
      title={copied ? strings.copied : strings.copy}
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
