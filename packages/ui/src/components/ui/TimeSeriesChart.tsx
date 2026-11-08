import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useElementWidth } from '../../hooks/useElementWidth';
import {
  type ChartColor,
  type ChartLineStyle,
  chartColorValue,
  chartLineDash,
  niceTicks,
} from '../../lib/chart';
import { useStrings } from '../../locale';
import './TimeSeriesChart.css';

/** A value at time `t`, in seconds; `null` is a gap, e.g. a bucket with no calls. */
export interface TimeSeriesPoint {
  t: number;
  v: number | null;
}

export interface TimeSeriesLine {
  key: string;
  label: string;
  color: ChartColor;
  lineStyle?: ChartLineStyle;
  points: TimeSeriesPoint[];
}

export interface TimeSeriesRow {
  key: string;
  /** The row's heading. */
  label: ReactNode;
  /** `bars` draws the first line as columns, one per bucket, e.g. a count. */
  kind?: 'line' | 'bars';
  lines: TimeSeriesLine[];
  /** Formats the axis and the readout, e.g. as a percentage. */
  formatValue?: (value: number) => string;
  /**
   * The axis reaches at least this high, so a series that stays near
   * zero draws flat instead of filling the row.
   */
  minMax?: number;
  /** After the heading while the pointer is off the chart, e.g. both windows' figures. */
  summary?: ReactNode;
}

/**
 * A stretch of time shaded behind every row: `baseline` in the muted
 * wash, `focus` (the window under test) in the warning wash.
 */
export interface TimeSeriesWindow {
  key: string;
  start: number;
  end: number;
  label: string;
  tone: 'baseline' | 'focus';
}

/** A moment drawn as a line through every row, e.g. when a fault was injected. */
export interface TimeSeriesMarker {
  key: string;
  at: number;
  label: string;
}

export interface TimeSeriesChartProps {
  /** Stacked over one time axis, as small multiples. */
  rows: TimeSeriesRow[];
  windows?: TimeSeriesWindow[];
  markers?: TimeSeriesMarker[];
  /**
   * Each point stands for the bucket of this many seconds from its `t`:
   * a line is drawn at the bucket's middle and a bar spans it.
   */
  bucketSeconds?: number;
  /** The time axis, in seconds. Default: the windows' and the points' extent. */
  domain?: [number, number];
  /**
   * Formats a time on the axis (`minute` ticks) and in the readout
   * (`second`). Default: local time, `HH:MM` or `HH:MM:SS`.
   */
  formatTime?: (t: number, precision: 'minute' | 'second') => string;
  /** `compact` rows are shorter, for a grid of small multiples. */
  density?: 'regular' | 'compact';
  /** Names the chart for assistive technology. */
  label: string;
  className?: string;
}

// The SVG is drawn at its measured CSS width, so these are true px. The
// CSS reads the heights through the custom properties set below.
const HEADER = { regular: 20, compact: 18 };
const PLOT = { regular: 60, compact: 34 };
const ROW_GAP = 6;
const TOP_STRIP = 18;
const AXIS = 20;
/** The value ticks' gutter: wide enough for the longest label, within these bounds. */
const PAD_LEFT_MIN = 28;
const PAD_LEFT_MAX = 72;
/** A tabular digit of the micro type role is about this share of its size. */
const TICK_CHAR_WIDTH = 6.2;
/** About the width of a character of a window or marker label. */
const LABEL_CHAR_WIDTH = 5.8;
const PAD_RIGHT = 8;
const TICK_GAP = 6;
const MIN_TICK_SPACING = 72;
const TIME_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600, 43200,
  86400,
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function defaultFormatTime(t: number, precision: 'minute' | 'second'): string {
  const d = new Date(t * 1000);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return precision === 'minute' ? hm : `${hm}:${pad2(d.getSeconds())}`;
}

/** Runs of consecutive points that have values; a `null` ends a run. */
function segments(points: TimeSeriesPoint[]): Array<Array<[number, number]>> {
  const runs: Array<Array<[number, number]>> = [];
  let run: Array<[number, number]> = [];
  for (const point of points) {
    if (point.v === null || !Number.isFinite(point.v)) {
      if (run.length > 0) {
        runs.push(run);
      }
      run = [];
    } else {
      run.push([point.t, point.v]);
    }
  }
  if (run.length > 0) {
    runs.push(run);
  }
  return runs;
}

function valueAt(line: TimeSeriesLine, t: number): number | null | undefined {
  return line.points.find((point) => point.t === t)?.v;
}

interface RowScale {
  /** The value the row's top edge stands for. */
  hi: number;
  /** The gridline drawn under the top edge, when the row has values. */
  topTick: number | undefined;
}

/**
 * The row's value axis from zero: two nice steps, the top one raised a
 * step when the data reach past it, so the gridline always covers the data.
 */
function rowScale(row: TimeSeriesRow): RowScale {
  const values = row.lines.flatMap((line) =>
    line.points.flatMap((p) =>
      p.v === null || !Number.isFinite(p.v) ? [] : [p.v],
    ),
  );
  const max = Math.max(...values, row.minMax ?? 0, 0);
  const ticks = niceTicks(0, max, 2);
  let topTick = ticks[ticks.length - 1] as number | undefined;
  if (topTick !== undefined && ticks.length > 1 && topTick < max) {
    topTick += ticks[1] - ticks[0];
  }
  return {
    hi: Math.max(topTick ?? 0, max, 1e-9),
    topTick: topTick !== undefined && topTick > 0 ? topTick : undefined,
  };
}

/**
 * Time series stacked as small multiples over one time axis, with shaded
 * windows behind them and marker lines through them, so a change that
 * starts at a marker shows in every row at once. Hover or the arrow keys
 * read out each row's values at one time.
 */
export function TimeSeriesChart({
  rows,
  windows = [],
  markers = [],
  bucketSeconds,
  domain,
  formatTime = defaultFormatTime,
  density = 'regular',
  label,
  className,
}: TimeSeriesChartProps): ReactElement {
  const strings = useStrings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [cursor, setCursor] = useState<number | null>(null);

  const times = useMemo(
    () =>
      [
        ...new Set(
          rows.flatMap((row) =>
            row.lines.flatMap((line) => line.points.map((p) => p.t)),
          ),
        ),
      ].sort((a, b) => a - b),
    [rows],
  );
  const bucket =
    bucketSeconds ??
    (times.length > 1
      ? Math.min(...times.slice(1).map((t, i) => t - times[i]))
      : 1);
  const offset = bucketSeconds === undefined ? 0 : bucketSeconds / 2;

  const headerH = HEADER[density];
  const plotH = PLOT[density];
  const rowH = headerH + plotH;
  const strip = windows.length > 0 || markers.length > 0 ? TOP_STRIP : 0;
  const heightFor = (topH: number): number =>
    topH + rows.length * rowH + Math.max(rows.length - 1, 0) * ROW_GAP + AXIS;
  const cls = [
    'aegis-time-series',
    `aegis-time-series--${density}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const sizeVarsFor = (h: number): CSSProperties =>
    ({
      '--aegis-time-series-header-h': `${String(headerH)}px`,
      '--aegis-time-series-height': `${String(h)}px`,
    }) as CSSProperties;

  const extent = [
    ...times,
    ...times.map((t) => t + (bucketSeconds ?? 0)),
    ...windows.flatMap((w) => [w.start, w.end]),
    ...markers.map((m) => m.at),
  ];
  if (width === 0 || extent.length === 0) {
    return (
      <div
        ref={wrapRef}
        className={cls}
        style={sizeVarsFor(heightFor(strip))}
      />
    );
  }
  const [t0, t1] = domain ?? [Math.min(...extent), Math.max(...extent)];
  const scales = rows.map(rowScale);
  const longestTick = Math.max(
    1,
    ...rows.map((row, index) => {
      const format = row.formatValue ?? String;
      const topTick = scales[index].topTick;
      return Math.max(
        format(0).length,
        topTick === undefined ? 0 : format(topTick).length,
      );
    }),
  );
  const left = Math.min(
    Math.max(TICK_GAP * 2 + longestTick * TICK_CHAR_WIDTH, PAD_LEFT_MIN),
    PAD_LEFT_MAX,
  );
  const right = width - PAD_RIGHT;
  const sx = (t: number): number =>
    left + (t1 > t0 ? ((t - t0) / (t1 - t0)) * (right - left) : 0);
  const markerLabelRight = (x: number): boolean => x < right - 120;
  const markerBoxes = markers.map((m): [number, number] => {
    const x = sx(m.at);
    const w = m.label.length * LABEL_CHAR_WIDTH;
    return markerLabelRight(x)
      ? [x + TICK_GAP, x + TICK_GAP + w]
      : [x - TICK_GAP - w, x - TICK_GAP];
  });
  /**
   * A window's label sits at the middle of its band, or at whichever end
   * keeps it clear of the marker labels in the same strip; null when
   * neither does.
   */
  const windowLabel = (
    x0: number,
    x1: number,
    text: string,
  ): { x: number; anchor: 'start' | 'middle' | 'end' } | null => {
    const w = text.length * LABEL_CHAR_WIDTH;
    const clear = (a: number, b: number): boolean =>
      markerBoxes.every(([c, d]) => b <= c || a >= d);
    const mid = (x0 + x1) / 2;
    if (clear(mid - w / 2, mid + w / 2)) {
      return { x: mid, anchor: 'middle' };
    }
    if (clear(x1 - TICK_GAP - w, x1 - TICK_GAP)) {
      return { x: x1 - TICK_GAP, anchor: 'end' };
    }
    if (clear(x0 + TICK_GAP, x0 + TICK_GAP + w)) {
      return { x: x0 + TICK_GAP, anchor: 'start' };
    }
    return null;
  };
  const bands = windows.map((w) => {
    const x0 = Math.max(sx(w.start), left);
    const x1 = Math.min(sx(w.end), right);
    return { w, x0, x1, place: windowLabel(x0, x1, w.label) };
  });
  // Where a window's label would run into a marker's, the window labels
  // drop to a strip of their own under the markers'.
  const stacked = bands.some((b) => b.x1 > b.x0 && b.place === null);
  const top = stacked ? TOP_STRIP * 2 : strip;
  const windowLabelY = top - TICK_GAP;
  const height = heightFor(top);

  const rowTop = (index: number): number => top + index * (rowH + ROW_GAP);
  const plotBottom = rowTop(rows.length - 1) + rowH;

  const step =
    TIME_STEPS.find(
      (s) => ((right - left) / Math.max(t1 - t0, 1)) * s >= MIN_TICK_SPACING,
    ) ?? TIME_STEPS[TIME_STEPS.length - 1];
  const tickPrecision = step % 60 === 0 ? 'minute' : 'second';
  const timeTicks: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
    timeTicks.push(t);
  }

  const nearest = (t: number): number =>
    times.reduce((best, candidate) =>
      Math.abs(candidate + offset - t) < Math.abs(best + offset - t)
        ? candidate
        : best,
    );
  const handlePointer = (event: PointerEvent<SVGRectElement>): void => {
    if (times.length === 0) {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setCursor(nearest(t0 + share * (t1 - t0)));
  };
  const handleKey = (event: KeyboardEvent<SVGRectElement>): void => {
    if (times.length === 0) {
      return;
    }
    const index = cursor === null ? -1 : times.indexOf(cursor);
    const target: Record<string, number> = {
      ArrowLeft: index <= 0 ? 0 : index - 1,
      ArrowRight: Math.min(index + 1, times.length - 1),
      Home: 0,
      End: times.length - 1,
    };
    if (event.key in target) {
      event.preventDefault();
      setCursor(times[target[event.key]]);
    } else if (event.key === 'Escape') {
      setCursor(null);
    }
  };

  const cursorX =
    cursor === null
      ? null
      : Math.min(Math.max(sx(cursor + offset), left + 28), right - 28);

  return (
    <div ref={wrapRef} className={cls} style={sizeVarsFor(height)}>
      <svg
        className="aegis-time-series__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role="img"
        aria-label={label}
      >
        {bands.map(({ w, x0, x1, place }) => {
          const at =
            stacked || place === null
              ? { x: (x0 + x1) / 2, anchor: 'middle' as const }
              : place;
          return x1 > x0 ? (
            <g key={w.key}>
              <rect
                className={`aegis-time-series__window aegis-time-series__window--${w.tone}`}
                x={x0}
                y={top}
                width={x1 - x0}
                height={plotBottom - top}
              />
              <text
                className={`aegis-time-series__window-label aegis-time-series__window-label--${w.tone}`}
                x={at.x}
                y={stacked ? windowLabelY : TOP_STRIP - TICK_GAP}
                textAnchor={at.anchor}
              >
                {w.label}
              </text>
            </g>
          ) : null;
        })}
        {rows.map((row, index) => {
          const y0 = rowTop(index) + headerH;
          const y1 = y0 + plotH;
          const { hi, topTick } = scales[index];
          const sy = (v: number): number => y1 - (v / hi) * (y1 - y0);
          const format = row.formatValue ?? String;
          return (
            <g key={row.key}>
              <line
                className="aegis-time-series__baseline"
                x1={left}
                x2={right}
                y1={y1}
                y2={y1}
              />
              {topTick !== undefined && (
                <>
                  <line
                    className="aegis-time-series__grid"
                    x1={left}
                    x2={right}
                    y1={sy(topTick)}
                    y2={sy(topTick)}
                  />
                  <text
                    className="aegis-time-series__tick"
                    x={left - TICK_GAP}
                    y={sy(topTick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {format(topTick)}
                  </text>
                </>
              )}
              <text
                className="aegis-time-series__tick"
                x={left - TICK_GAP}
                y={y1}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {format(0)}
              </text>
              {row.kind === 'bars' && row.lines.length > 0
                ? row.lines[0].points.map((p) => {
                    if (p.v === null || !(p.v > 0)) {
                      return null;
                    }
                    const xa = sx(p.t);
                    const xb = sx(p.t + bucket);
                    return (
                      <rect
                        key={p.t}
                        className="aegis-time-series__bar"
                        x={xa}
                        y={sy(p.v)}
                        width={Math.max(xb - xa - 1, 1)}
                        height={y1 - sy(p.v)}
                        style={{ fill: chartColorValue(row.lines[0].color) }}
                      />
                    );
                  })
                : row.lines.map((line) =>
                    segments(line.points).map((run) =>
                      run.length === 1 ? (
                        <circle
                          key={`${line.key}-${String(run[0][0])}`}
                          className="aegis-time-series__point"
                          cx={sx(run[0][0] + offset)}
                          cy={sy(run[0][1])}
                          r={2}
                          style={{ fill: chartColorValue(line.color) }}
                        />
                      ) : (
                        <polyline
                          key={`${line.key}-${String(run[0][0])}`}
                          className="aegis-time-series__line"
                          points={run
                            .map(
                              ([t, v]) =>
                                `${String(sx(t + offset))},${String(sy(v))}`,
                            )
                            .join(' ')}
                          style={{
                            stroke: chartColorValue(line.color),
                            strokeDasharray: chartLineDash(
                              line.lineStyle ?? 'solid',
                            ),
                          }}
                        />
                      ),
                    ),
                  )}
            </g>
          );
        })}
        {markers.map((m) => {
          const x = sx(m.at);
          const toRight = markerLabelRight(x);
          return (
            <g key={m.key}>
              <line
                className="aegis-time-series__marker"
                x1={x}
                x2={x}
                y1={top === 0 ? 0 : TICK_GAP / 2}
                y2={plotBottom}
              />
              <text
                className="aegis-time-series__marker-label"
                x={toRight ? x + TICK_GAP : x - TICK_GAP}
                y={TOP_STRIP - TICK_GAP}
                textAnchor={toRight ? 'start' : 'end'}
              >
                {m.label}
              </text>
            </g>
          );
        })}
        {timeTicks
          .filter(
            (t) =>
              cursorX === null || Math.abs(sx(t) - cursorX) >= MIN_TICK_SPACING,
          )
          .map((t) => (
            <text
              key={t}
              className="aegis-time-series__tick"
              x={sx(t)}
              y={height - TICK_GAP}
              textAnchor="middle"
            >
              {formatTime(t, tickPrecision)}
            </text>
          ))}
        {cursor !== null && cursorX !== null && (
          <g className="aegis-time-series__cursor">
            <line
              x1={sx(cursor + offset)}
              x2={sx(cursor + offset)}
              y1={top}
              y2={plotBottom}
            />
            <text
              className="aegis-time-series__cursor-label"
              x={cursorX}
              y={height - TICK_GAP}
              textAnchor="middle"
            >
              {formatTime(cursor, 'second')}
            </text>
          </g>
        )}
        <rect
          className="aegis-time-series__overlay"
          x={left}
          y={top}
          width={Math.max(right - left, 0)}
          height={Math.max(plotBottom - top, 0)}
          tabIndex={0}
          role="slider"
          aria-label={strings.timeSeriesTime}
          aria-valuemin={times[0]}
          aria-valuemax={times[times.length - 1]}
          aria-valuenow={cursor ?? times[0]}
          aria-valuetext={
            cursor === null ? undefined : formatTime(cursor, 'second')
          }
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => {
            setCursor(null);
          }}
          onKeyDown={handleKey}
          onBlur={() => {
            setCursor(null);
          }}
        />
      </svg>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="aegis-time-series__row-head"
          style={{
            top: rowTop(index),
            left,
            width: Math.max(right - left, 0),
          }}
        >
          <span className="aegis-time-series__row-label">{row.label}</span>
          {row.lines.length > 1 && row.kind !== 'bars' && (
            <span className="aegis-time-series__keys" aria-hidden="true">
              {row.lines.map((line) => (
                <span key={line.key} className="aegis-time-series__key">
                  <svg
                    className="aegis-time-series__key-swatch"
                    viewBox="0 0 16 4"
                  >
                    <line
                      x1={0}
                      x2={16}
                      y1={2}
                      y2={2}
                      style={{
                        stroke: chartColorValue(line.color),
                        strokeDasharray: chartLineDash(
                          line.lineStyle ?? 'solid',
                        ),
                      }}
                    />
                  </svg>
                  {line.label}
                </span>
              ))}
            </span>
          )}
          <span className="aegis-time-series__readout">
            {cursor === null
              ? row.summary
              : row.lines
                  .slice(0, row.kind === 'bars' ? 1 : undefined)
                  .map((line) => {
                    const v = valueAt(line, cursor);
                    const text =
                      v === null || v === undefined
                        ? strings.timeSeriesNoValue
                        : (row.formatValue ?? String)(v);
                    return row.lines.length > 1 && row.kind !== 'bars'
                      ? `${line.label} ${text}`
                      : text;
                  })
                  .join(' · ')}
          </span>
        </div>
      ))}
    </div>
  );
}
