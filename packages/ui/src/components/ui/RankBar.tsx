import { type CSSProperties, type ReactNode } from 'react';

import { useStrings } from '../../locale';
import './RankBar.css';

export interface RankBarItem {
  key: string;
  label: ReactNode;
  /**
   * `null` is a missing value: an em dash over an empty track, distinct
   * from a real 0, which keeps a visible endpoint.
   */
  value: number | null;
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
  /** Makes each row's label and bar track select that row. */
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
  const strings = useStrings();
  const values = items.flatMap((item) =>
    item.value === null ? [] : [item.value],
  );
  const upperBound = max ?? Math.max(...values, 1);
  const cls = ['aegis-rank-bar', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {items.map((item, index) => {
        const { value } = item;
        const fill =
          value === null ? null : (
            <div
              className={[
                'aegis-rank-bar__fill',
                value === 0 ? 'aegis-rank-bar__fill--zero' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  width: `${(upperBound > 0 ? (value / upperBound) * 100 : 0).toString()}%`,
                  '--aegis-rank-bar-index': index,
                } as CSSProperties
              }
            />
          );
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
            {onSelect ? (
              // The label button is the keyboard and screen-reader target;
              // the track only widens the pointer target.
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="aegis-rank-bar__track aegis-rank-bar__track--link"
                onClick={() => {
                  onSelect(item.key);
                }}
              >
                {fill}
              </button>
            ) : (
              <div
                className="aegis-rank-bar__track"
                role="img"
                aria-label={
                  value === null
                    ? strings.noValue
                    : strings.barValue(format(value), format(upperBound))
                }
              >
                {fill}
              </div>
            )}
            <span
              className={
                value === null
                  ? 'aegis-rank-bar__value aegis-rank-bar__value--empty'
                  : 'aegis-rank-bar__value'
              }
            >
              {value === null ? '—' : format(value)}
            </span>
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
