import { type CSSProperties, type ReactNode } from 'react';

import {
  type ChartColor,
  chartColorValue,
  stageProgress,
  staggeredProgress,
  zeroAnchoredDomain,
} from '../../lib/chart';
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
  /** The value's confidence interval, drawn as a line over the bar. */
  interval?: [number, number];
  /** Trailing slot for a per-row link, e.g. "逐题表现". */
  action?: ReactNode;
  /**
   * The bar's colour, e.g. the series colour of the model's vendor.
   * Defaults to `--rank-bar-fill`.
   */
  color?: ChartColor;
}

interface RankBarProps {
  items: RankBarItem[];
  /**
   * Upper bound of the scale. Defaults to the largest value, or 1 when all
   * are 0; pass `1` for a share or a 0–1 score.
   */
  max?: number;
  /** Scale hint rendered at the bottom, e.g. "越高越好". */
  direction?: ReactNode;
  format?: (value: number) => string;
  /** `sm` is a thin bar, for rows that lead with their label. Defaults to `md`. */
  size?: 'md' | 'sm';
  /** Makes each row's label and bar track select that row. */
  onSelect?: (key: string) => void;
  /**
   * How far the bars are drawn, 0 to 1, for a chart that draws as its
   * section scrolls in (`useScrollProgress`). Omitted, the bars draw in
   * once when they mount.
   */
  progress?: number;
  className?: string;
}

export function RankBar({
  items,
  max,
  direction,
  format = (value) => value.toFixed(2),
  size = 'md',
  onSelect,
  progress,
  className,
}: RankBarProps) {
  const strings = useStrings();
  const values = items.flatMap((item) =>
    item.value === null ? [] : [item.value],
  );
  const [, upperBound] = zeroAnchoredDomain(values, max);
  const cls = [
    'aegis-rank-bar',
    size === 'sm' ? 'aegis-rank-bar--sm' : '',
    progress === undefined ? '' : 'aegis-rank-bar--scroll',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {items.map((item, index) => {
        const { value, interval } = item;
        const share = (part: number): string =>
          `${(upperBound > 0 ? (part / upperBound) * 100 : 0).toString()}%`;
        const drawn =
          progress === undefined
            ? 1
            : staggeredProgress(progress, index, items.length);
        const intervalMark = interval && (
          <span
            className="aegis-rank-bar__interval"
            style={{
              left: share(interval[0]),
              width: share(interval[1] - interval[0]),
              opacity: `calc(var(--chart-interval-opacity) * ${stageProgress(drawn, 0.8, 1).toString()})`,
            }}
          />
        );
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
                  width: share(value),
                  '--aegis-rank-bar-index': index,
                  ...(item.color === undefined || value === 0
                    ? {}
                    : { background: chartColorValue(item.color) }),
                  ...(progress === undefined
                    ? {}
                    : {
                        '--aegis-rank-bar-progress': stageProgress(
                          drawn,
                          0,
                          interval ? 0.8 : 1,
                        ),
                      }),
                } as CSSProperties
              }
            >
              <span className="aegis-rank-bar__ink" />
            </div>
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
                {intervalMark}
              </button>
            ) : (
              <div
                className="aegis-rank-bar__track"
                role="img"
                aria-label={
                  value === null
                    ? strings.noValue
                    : `${strings.barValue(format(value), format(upperBound))}${
                        interval
                          ? ` (${format(interval[0])}–${format(interval[1])})`
                          : ''
                      }`
                }
              >
                {fill}
                {intervalMark}
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
