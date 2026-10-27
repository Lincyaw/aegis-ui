import { type CSSProperties, type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
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
  /**
   * Leading mono label in the `numbered` variant, e.g. a step number.
   * Defaults to the 1-based position, zero-padded to two digits.
   */
  marker?: ReactNode;
}

export type TimelineSurface = PrimitiveSurface<TimelineItem[]>;

interface TimelineProps {
  items: TimelineItem[];
  /**
   * `numbered` replaces the dot and connector with a leading mono marker
   * column, separates rows with hairlines and keeps the line breaks of
   * each description.
   */
  variant?: 'dot' | 'numbered';
  /**
   * `compact` keeps each title on one line with an ellipsis (a string title
   * shows in full on hover) and tightens the rows.
   */
  density?: 'comfortable' | 'compact';
  /** Reverse visual order (newest first vs oldest first). Doesn't sort. */
  className?: string;
  style?: CSSProperties;
  surface?: TimelineSurface;
}

export function Timeline({
  items,
  variant = 'dot',
  density = 'comfortable',
  className,
  style,
  surface,
}: TimelineProps) {
  const wrapRef = useRef<HTMLOListElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, items, 'timeline', wrapRef);
  const numbered = variant === 'numbered';
  const compact = density === 'compact';
  const rootClass = [
    'aegis-timeline',
    numbered ? 'aegis-timeline--numbered' : '',
    compact ? 'aegis-timeline--compact' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <ol ref={wrapRef} className={rootClass} style={style} {...agentAttrs}>
      {items.map((it, index) => (
        <li
          key={it.id}
          className={
            numbered
              ? 'aegis-timeline__item aegis-timeline__item--numbered'
              : 'aegis-timeline__item'
          }
        >
          {numbered ? (
            <span className="aegis-timeline__marker">
              {it.marker ?? String(index + 1).padStart(2, '0')}
            </span>
          ) : (
            <span
              className="aegis-timeline__dot"
              style={it.dotColor ? { background: it.dotColor } : undefined}
            />
          )}
          <div className="aegis-timeline__body">
            <div className="aegis-timeline__row">
              <span
                className="aegis-timeline__title"
                title={
                  compact && typeof it.title === 'string' ? it.title : undefined
                }
              >
                {it.title}
              </span>
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
