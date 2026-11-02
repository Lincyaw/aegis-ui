import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  type ChartColor,
  chartColorValue,
  niceTicks,
  stageProgress,
  staggeredProgress,
  zeroAnchoredDomain,
} from '../../lib/chart';
import './ColumnChart.css';
import { RankBar } from './RankBar';
import { SeriesLabel } from './SeriesLabel';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface ColumnChartItem {
  key: string;
  /** The column's name, shown under it. */
  label: ReactNode;
  /** A muted second line, e.g. the harness it ran with. */
  detail?: ReactNode;
  /** `null` is a missing value: an em dash and no column. */
  value: number | null;
  /** The value's confidence interval, drawn as a line through the column. */
  interval?: [number, number];
  /** The column's colour, e.g. its vendor's series token. Defaults to `--rank-bar-fill`. */
  color?: ChartColor;
  /** Makes the name a link. */
  to?: string;
}

export interface ColumnChartProps {
  items: ColumnChartItem[];
  /** Upper bound of the scale. Defaults to the largest value or interval. */
  max?: number;
  /** The gridlines. Defaults to about five round values. */
  ticks?: number[];
  format?: (value: number) => string;
  /** Formats the gridline labels. Defaults to `format`. */
  formatTick?: (value: number) => string;
  /** Names the chart for a screen reader. */
  label: string;
  /**
   * How far the chart is drawn, 0 to 1, for one that draws as its section
   * scrolls in (`useScrollProgress`): each column grows in turn, then its
   * value appears, then its interval. Omitted, the columns grow once when
   * they mount.
   */
  progress?: number;
  /** Renders the names' links. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
}

const NARROW_QUERY = '(max-width: 768px)';
const DEFAULT_COLOR: ChartColor = 'var(--rank-bar-fill)';

/**
 * Vertical bars on one scale, each named under its column, with a value
 * and an optional confidence interval. At 768px and narrower it reads as a
 * `RankBar`, because columns and their names no longer fit side by side.
 */
export function ColumnChart({
  items,
  max,
  ticks,
  format = String,
  formatTick = format,
  label,
  progress,
  linkComponent: Link = DefaultLink,
  className,
}: ColumnChartProps): ReactElement {
  const narrow = useMediaQuery(NARROW_QUERY);
  const values = items.flatMap((item) => [
    ...(item.value === null ? [] : [item.value]),
    ...(item.interval ?? []),
  ]);
  const [, upperBound] = zeroAnchoredDomain(values, max);
  const scale = (value: number): string =>
    `${(Math.min(Math.max(value / upperBound, 0), 1) * 100).toString()}%`;

  if (narrow) {
    return (
      <RankBar
        className={className}
        size="sm"
        max={upperBound}
        format={format}
        progress={progress}
        items={items.map((item) => ({
          key: item.key,
          label: (
            <SeriesLabel
              name={item.label}
              detail={item.detail}
              color={item.color ?? DEFAULT_COLOR}
              to={item.to}
              linkComponent={Link}
            />
          ),
          value: item.value,
          interval: item.interval,
          color: item.color,
        }))}
      />
    );
  }

  const gridlines = ticks ?? niceTicks(0, upperBound);
  const columnCount = Math.max(items.length, 1);
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        'aegis-column-chart',
        progress === undefined ? '' : 'aegis-column-chart--scroll',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--aegis-column-chart-count': columnCount } as CSSProperties}
    >
      <div className="aegis-column-chart__plot">
        <div className="aegis-column-chart__grid" aria-hidden="true">
          {gridlines.map((tick) => (
            <span
              key={tick}
              className="aegis-column-chart__tick"
              style={{ bottom: scale(tick) }}
            >
              <span className="aegis-column-chart__tick-label">
                {formatTick(tick)}
              </span>
            </span>
          ))}
        </div>
        <div className="aegis-column-chart__columns">
          {items.map((item, index) => {
            const drawn =
              progress === undefined
                ? 1
                : staggeredProgress(progress, index, items.length);
            const { value, interval } = item;
            const top = Math.max(value ?? 0, interval?.[1] ?? 0);
            return (
              <div
                key={item.key}
                className="aegis-column-chart__column"
                style={
                  {
                    '--aegis-column-chart-index': index,
                    '--aegis-column-chart-grow': stageProgress(drawn, 0, 0.7),
                    '--aegis-column-chart-value': stageProgress(
                      drawn,
                      0.7,
                      0.85,
                    ),
                    '--aegis-column-chart-interval': stageProgress(
                      drawn,
                      0.85,
                      1,
                    ),
                    '--aegis-column-chart-color': chartColorValue(
                      item.color ?? DEFAULT_COLOR,
                    ),
                  } as CSSProperties
                }
              >
                {value !== null && (
                  <span
                    className={[
                      'aegis-column-chart__bar',
                      value === 0 ? 'aegis-column-chart__bar--zero' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ height: scale(value) }}
                  >
                    <span className="aegis-column-chart__ink" />
                  </span>
                )}
                {interval !== undefined && (
                  <span
                    className="aegis-column-chart__interval"
                    style={{
                      bottom: scale(interval[0]),
                      height: `${(((interval[1] - interval[0]) / upperBound) * 100).toString()}%`,
                    }}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={
                    value === null
                      ? 'aegis-column-chart__value aegis-column-chart__value--empty'
                      : 'aegis-column-chart__value'
                  }
                  style={{ bottom: scale(top) }}
                >
                  {value === null ? '—' : format(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="aegis-column-chart__labels">
        {items.map((item) => (
          <div key={item.key} className="aegis-column-chart__label">
            {item.to === undefined ? (
              <span className="aegis-column-chart__name">{item.label}</span>
            ) : (
              <Link
                to={item.to}
                className="aegis-column-chart__name aegis-column-chart__name--link"
              >
                {item.label}
              </Link>
            )}
            {item.detail !== undefined && (
              <span className="aegis-column-chart__detail">{item.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
