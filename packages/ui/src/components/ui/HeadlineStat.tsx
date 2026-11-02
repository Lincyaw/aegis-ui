import type { ReactElement, ReactNode } from 'react';

import './HeadlineStat.css';

export interface HeadlineStatProps {
  /** The figure, e.g. "97.6%" or "46 / 47". */
  value: ReactNode;
  /** The sentence that reads the figure. */
  caption: ReactNode;
  className?: string;
}

/** The figure behind a finding: one large number over the sentence that reads it. */
export function HeadlineStat({
  value,
  caption,
  className,
}: HeadlineStatProps): ReactElement {
  return (
    <div
      className={['aegis-headline-stat', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="aegis-headline-stat__value">{value}</span>
      <span className="aegis-headline-stat__caption">{caption}</span>
    </div>
  );
}
