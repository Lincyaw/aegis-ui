import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useMemo,
  useRef,
} from 'react';

import { useElementWidth } from '../../hooks/useElementWidth';
import { type ChartColor, chartColorValue, niceTicks } from '../../lib/chart';
import './LineChart.css';

export interface LineChartPoint {
  x: number;
  y: number;
}

export interface LineChartSeries {
  key: string;
  /** Written at the end of the line, with its last value. */
  label: string;
  color: ChartColor;
  points: LineChartPoint[];
}

export interface LineChartMarker {
  key: string;
  x: number;
  color: ChartColor;
  /** Names the event, in its tooltip and to a screen reader. */
  label: string;
}

export interface LineChartProps {
  series: LineChartSeries[];
  /** Names the chart for a screen reader. */
  label: string;
  /** Names the horizontal axis, e.g. "回合". */
  xLabel?: string;
  /** The gridlines. Defaults to about five round values. */
  yTicks?: number[];
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  /** Where a replay's playhead is on the horizontal axis. */
  playhead?: number;
  /** Lets the reader click or use the arrow keys to move the playhead. */
  onSeek?: (x: number) => void;
  /** Events on the horizontal axis, e.g. a replay's key moments. */
  markers?: LineChartMarker[];
  /**
   * How far the lines are drawn, 0 to 1, for a chart that draws as its
   * section scrolls in (`useScrollProgress`). Omitted, it shows its final state.
   */
  progress?: number;
  className?: string;
}

// The SVG is drawn at its measured CSS width, so these are true px.
const HEIGHT = 240;
const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const END_LABEL_GAP = 8;
const END_LABEL_LINE = 16;
const MARKER_RADIUS = 4;

/**
 * Lines over a shared horizontal axis, labelled at their ends instead of
 * in a legend, with an optional playhead the reader can move.
 */
export function LineChart({
  series,
  label,
  xLabel,
  yTicks,
  formatX = String,
  formatY = String,
  playhead,
  onSeek,
  markers = [],
  progress,
  className,
}: LineChartProps): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const points = series.flatMap((line) => line.points);
  const xs = useMemo(
    () => [...new Set(points.map((point) => point.x))].sort((a, b) => a - b),
    [points],
  );
  const cls = ['aegis-line-chart', className ?? ''].filter(Boolean).join(' ');
  if (width === 0 || xs.length === 0) {
    return <div ref={wrapRef} className={cls} />;
  }

  const xLo = xs[0];
  const xHi = xs[xs.length - 1];
  const values = points.map((point) => point.y);
  const ticks = yTicks ?? niceTicks(0, Math.max(...values, 1));
  const yHi = Math.max(...ticks, ...values);
  const left = PAD_LEFT;
  const right = width - PAD_RIGHT;
  const top = PAD_TOP;
  const bottom = HEIGHT - PAD_BOTTOM;
  const sx = (x: number): number =>
    left + ((x - xLo) / Math.max(xHi - xLo, 1)) * (right - left);
  const sy = (y: number): number => bottom - (y / yHi) * (bottom - top);

  // The end labels stack upwards when two lines finish close together.
  const ends = series
    .flatMap((line) => {
      const last = line.points[line.points.length - 1] as
        | LineChartPoint
        | undefined;
      return last === undefined ? [] : [{ line, last, y: sy(last.y) }];
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) {
    if (ends[i].y - ends[i - 1].y < END_LABEL_LINE) {
      ends[i].y = ends[i - 1].y + END_LABEL_LINE;
    }
  }

  const nearestX = (x: number): number =>
    xs.reduce((best, candidate) =>
      Math.abs(candidate - x) < Math.abs(best - x) ? candidate : best,
    );
  const seekFromPointer = (event: MouseEvent<SVGRectElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    onSeek?.(nearestX(xLo + share * (xHi - xLo)));
  };
  const seekFromKey = (event: KeyboardEvent<SVGRectElement>): void => {
    const index = xs.indexOf(nearestX(playhead ?? xLo));
    const target: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      Home: 0,
      End: xs.length - 1,
    };
    if (event.key in target) {
      event.preventDefault();
      onSeek?.(xs[Math.min(Math.max(target[event.key], 0), xs.length - 1)]);
    }
  };

  return (
    <div ref={wrapRef} className={cls}>
      <svg
        className="aegis-line-chart__svg"
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width.toString()} ${HEIGHT.toString()}`}
        role={onSeek ? 'group' : 'img'}
        aria-label={label}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="aegis-line-chart__grid"
              x1={left}
              x2={right}
              y1={sy(tick)}
              y2={sy(tick)}
            />
            <text
              className="aegis-line-chart__tick"
              x={left - END_LABEL_GAP}
              y={sy(tick)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatY(tick)}
            </text>
          </g>
        ))}
        {series.map((line) => (
          <polyline
            key={line.key}
            className="aegis-line-chart__line"
            pathLength={1}
            points={line.points
              .map(
                (point) =>
                  `${sx(point.x).toString()},${sy(point.y).toString()}`,
              )
              .join(' ')}
            style={
              {
                stroke: chartColorValue(line.color),
                ...(progress === undefined
                  ? {}
                  : { '--aegis-line-chart-progress': progress }),
              } as CSSProperties
            }
          />
        ))}
        {markers.map((marker) => (
          <circle
            key={marker.key}
            className="aegis-line-chart__marker"
            cx={sx(marker.x)}
            cy={bottom}
            r={MARKER_RADIUS}
            style={{ fill: chartColorValue(marker.color) }}
          >
            <title>{marker.label}</title>
          </circle>
        ))}
        {ends.map(({ line, last, y }) => (
          <text
            key={line.key}
            className="aegis-line-chart__end-label"
            x={right}
            y={y - END_LABEL_GAP}
            textAnchor="end"
            style={{ fill: chartColorValue(line.color) }}
          >
            {`${line.label} ${formatY(last.y)}`}
          </text>
        ))}
        {playhead !== undefined && (
          <g>
            <line
              className="aegis-line-chart__playhead"
              x1={sx(playhead)}
              x2={sx(playhead)}
              y1={top}
              y2={bottom}
            />
            <text
              className="aegis-line-chart__playhead-label"
              x={sx(playhead)}
              y={top - END_LABEL_GAP / 2}
              textAnchor="middle"
            >
              {formatX(playhead)}
            </text>
          </g>
        )}
        <text
          className="aegis-line-chart__tick"
          x={left}
          y={HEIGHT - END_LABEL_GAP}
          textAnchor="start"
        >
          {formatX(xLo)}
        </text>
        <text
          className="aegis-line-chart__tick"
          x={right}
          y={HEIGHT - END_LABEL_GAP}
          textAnchor="end"
        >
          {formatX(xHi)}
        </text>
        {xLabel !== undefined && (
          <text
            className="aegis-line-chart__tick"
            x={(left + right) / 2}
            y={HEIGHT - END_LABEL_GAP}
            textAnchor="middle"
          >
            {xLabel}
          </text>
        )}
        {onSeek && (
          <rect
            className="aegis-line-chart__seek"
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={xLo}
            aria-valuemax={xHi}
            aria-valuenow={playhead ?? xLo}
            aria-valuetext={formatX(playhead ?? xLo)}
            onClick={seekFromPointer}
            onKeyDown={seekFromKey}
          />
        )}
      </svg>
    </div>
  );
}
