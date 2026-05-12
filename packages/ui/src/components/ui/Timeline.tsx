import type { CSSProperties, ReactNode } from 'react';

import './Timeline.css';

export interface TimelineItem {
  id: string;
  /** Headline — actor / event / verb, e.g. "alice@aegis updated `db.dsn`". */
  title: ReactNode;
  /** Body — optional secondary line. */
  description?: ReactNode;
  /** Absolute timestamp; rendered with `var(--font-mono)`. */
  timestamp?: ReactNode;
  /** Slot at the end of the row (e.g. revision chip). */
  meta?: ReactNode;
  /** Override dot colour with a CSS custom property name or raw token. */
  dotColor?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  /** Reverse visual order (newest first vs oldest first). Doesn't sort. */
  className?: string;
  style?: CSSProperties;
}

export function Timeline({ items, className, style }: TimelineProps) {
  const rootClass = ['aegis-timeline', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <ol className={rootClass} style={style}>
      {items.map((it) => (
        <li key={it.id} className="aegis-timeline__item">
          <span
            className="aegis-timeline__dot"
            style={it.dotColor ? { background: it.dotColor } : undefined}
          />
          <div className="aegis-timeline__body">
            <div className="aegis-timeline__row">
              <span className="aegis-timeline__title">{it.title}</span>
              {it.meta ? (
                <span className="aegis-timeline__meta">{it.meta}</span>
              ) : null}
            </div>
            {it.description ? (
              <div className="aegis-timeline__desc">{it.description}</div>
            ) : null}
            {it.timestamp ? (
              <div className="aegis-timeline__time">{it.timestamp}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
