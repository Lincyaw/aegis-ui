import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import './KeyMomentCard.css';

export interface KeyMomentCardProps {
  /** Where the moment falls, e.g. "#113" or "T31". */
  step: ReactNode;
  /** What kind of moment it is, e.g. "执行报错". */
  kind: ReactNode;
  /** The kind's colour, the same as its steps on the strip. */
  color: ChartColor;
  title: ReactNode;
  detail?: ReactNode;
  /** Makes the card a button, e.g. one that moves the replay to the moment. */
  onSelect?: () => void;
  /** The moment the replay is on. */
  selected?: boolean;
  className?: string;
}

/** One moment of a replay that changed its course: where, what kind and what happened. */
export function KeyMomentCard({
  step,
  kind,
  color,
  title,
  detail,
  onSelect,
  selected = false,
  className,
}: KeyMomentCardProps): ReactElement {
  const cls = [
    'aegis-key-moment',
    onSelect ? 'aegis-key-moment--interactive' : '',
    selected ? 'aegis-key-moment--selected' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = {
    '--aegis-key-moment-color': chartColorValue(color),
  } as CSSProperties;
  const body = (
    <>
      <span className="aegis-key-moment__head">
        <span className="aegis-key-moment__dot" aria-hidden="true" />
        <span className="aegis-key-moment__step">{step}</span>
        <span className="aegis-key-moment__kind">{kind}</span>
      </span>
      <span className="aegis-key-moment__title">{title}</span>
      {detail !== undefined && (
        <span className="aegis-key-moment__detail">{detail}</span>
      )}
    </>
  );
  return onSelect ? (
    <button
      type="button"
      className={cls}
      style={style}
      aria-current={selected ? 'step' : undefined}
      onClick={onSelect}
    >
      {body}
    </button>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}
