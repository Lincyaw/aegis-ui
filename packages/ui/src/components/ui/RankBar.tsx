import { type ReactNode } from 'react';

import './RankBar.css';

export interface RankBarItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Trailing slot for a per-row link, e.g. "逐题表现". */
  action?: ReactNode;
}

interface RankBarProps {
  items: RankBarItem[];
  /** Upper bound of the scale. Defaults to the largest value, or 1 when all are 0. */
  max?: number;
  /** Scale hint rendered at the bottom, e.g. "越高越好". */
  direction?: ReactNode;
  format?: (value: number) => string;
  onSelect?: (key: string) => void;
  className?: string;
}

export function RankBar({
  items,
  max,
  direction,
  format = (value) => value.toFixed(2),
  onSelect,
  className,
}: RankBarProps) {
  const upperBound = max ?? Math.max(...items.map((item) => item.value), 1);
  const cls = ['aegis-rank-bar', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {items.map((item) => {
        const ratio = upperBound > 0 ? item.value / upperBound : 0;
        const zero = item.value === 0;
        return (
          <div className="aegis-rank-bar__row" key={item.key}>
            {onSelect ? (
              <button
                type="button"
                className="aegis-rank-bar__label aegis-rank-bar__label--link"
                onClick={() => {
                  onSelect(item.key);
                }}
              >
                {item.label}
              </button>
            ) : (
              <span className="aegis-rank-bar__label">{item.label}</span>
            )}
            <div
              className="aegis-rank-bar__track"
              role="img"
              aria-label={`${format(item.value)} of ${format(upperBound)}`}
            >
              <div
                className={[
                  'aegis-rank-bar__fill',
                  zero ? 'aegis-rank-bar__fill--zero' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ width: `${(ratio * 100).toString()}%` }}
              />
            </div>
            <span className="aegis-rank-bar__value">{format(item.value)}</span>
            <span className="aegis-rank-bar__action">{item.action}</span>
          </div>
        );
      })}
      <div className="aegis-rank-bar__scale">
        <span className="aegis-rank-bar__spacer" />
        <div className="aegis-rank-bar__ticks">
          <span>0</span>
          {direction !== undefined && (
            <span className="aegis-rank-bar__direction">{direction}</span>
          )}
          <span>{format(upperBound)}</span>
        </div>
      </div>
    </div>
  );
}
