import type { ReactNode } from 'react';

import './Quote.css';

export interface QuoteProps {
  /**
   * `neutral` sets off text quoted from a source, e.g. a requirement's
   * statement. `warning` is the anomaly tone: quoted failure output only.
   */
  tone?: 'neutral' | 'warning';
  children: ReactNode;
  className?: string;
}

/** Quoted text set off by a rule down its left edge. */
export function Quote({ tone = 'neutral', children, className }: QuoteProps) {
  const cls = ['aegis-quote', `aegis-quote--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return <blockquote className={cls}>{children}</blockquote>;
}
