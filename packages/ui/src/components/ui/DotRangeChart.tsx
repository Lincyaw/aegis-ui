import type { CSSProperties, ReactElement, ReactNode } from 'react';

import {
  type ChartColor,
  chartColorValue,
  stageProgress,
  staggeredProgress,
} from '../../lib/chart';
import './DotRangeChart.css';

export interface DotRangeChartDot {
  value: number;
  /** An outlined dot, e.g. the baseline a row is measured against. */
  hollow?: boolean;
}

export interface DotRangeChartItem {
  key: string;
  label: ReactNode;
  /** The line's two ends. */
  range: [number, number];
  /** The row's dots; `extend` grows the line from the first towards the last. */
  dots: DotRangeChartDot[];
  /** The row's colour, e.g. its vendor's series token. */
  color: ChartColor;
  /** The row's reading, at its end, e.g. "1,412" or "+18.3". */
  value: ReactNode;
}

export interface DotRangeChartProps {
  items: DotRangeChartItem[];
  /** The scale's two ends. */
  domain: [number, number];
  /**
   * How `progress` draws a row. `extend` grows the line out of the first
   * dot to the last, as for a before and after. `slide` moves the dots in
   * from the start of the scale and then unfolds the line, as for a
   * reading and its interval. Defaults to `extend`.
   */
  motion?: 'extend' | 'slide';
  /** Names the chart for a screen reader. */
  label: string;
  /**
   * How far the chart is drawn, 0 to 1, for one that draws as its section
   * scrolls in (`useScrollProgress`). Omitted, it shows its final state.
   */
  progress?: number;
  className?: string;
}

/**
 * Rows of dots joined by a line on one scale: a reading with its interval,
 * or the same thing before and after a change.
 */
export function DotRangeChart({
  items,
  domain,
  motion = 'extend',
  label,
  progress,
  className,
}: DotRangeChartProps): ReactElement {
  const [lo, hi] = domain;
  const share = (value: number): number =>
    Math.min(Math.max((value - lo) / (hi - lo), 0), 1);
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        'aegis-dot-range',
        `aegis-dot-range--${motion}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item, index) => {
        const drawn =
          progress === undefined
            ? 1
            : staggeredProgress(progress, index, items.length);
        const start = share(Math.min(...item.range));
        const end = share(Math.max(...item.range));
        const anchor = share(item.dots[0]?.value ?? item.range[0]);
        const lineDrawn =
          motion === 'extend'
            ? stageProgress(drawn, 0, 0.85)
            : stageProgress(drawn, 0.6, 1);
        const dotsDrawn =
          motion === 'extend' ? 1 : stageProgress(drawn, 0, 0.6);
        return (
          <div key={item.key} className="aegis-dot-range__row">
            <div className="aegis-dot-range__label">{item.label}</div>
            <div
              className="aegis-dot-range__plot"
              style={
                {
                  '--aegis-dot-range-color': chartColorValue(item.color),
                } as CSSProperties
              }
            >
              <span className="aegis-dot-range__track" />
              <span
                className="aegis-dot-range__line"
                style={{
                  left: `${(start * 100).toString()}%`,
                  width: `${((end - start) * 100).toString()}%`,
                  transform: `scaleX(${lineDrawn.toString()})`,
                  transformOrigin:
                    motion === 'slide' || anchor <= start ? 'left' : 'right',
                }}
              />
              {item.dots.map((dot, dotIndex) => (
                <span
                  key={dotIndex}
                  className="aegis-dot-range__mover"
                  style={{
                    transform: `translateX(${(share(dot.value) * dotsDrawn * 100).toString()}%)`,
                    opacity:
                      motion === 'extend' && dotIndex > 0
                        ? stageProgress(drawn, 0.85, 1)
                        : stageProgress(drawn, 0, 0.1),
                  }}
                >
                  <span
                    className={[
                      'aegis-dot-range__dot',
                      dot.hollow ? 'aegis-dot-range__dot--hollow' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                </span>
              ))}
            </div>
            <span className="aegis-dot-range__value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
