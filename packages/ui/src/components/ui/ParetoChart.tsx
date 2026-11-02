import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
} from 'react';

import { useElementWidth } from '../../hooks/useElementWidth';
import {
  type ChartColor,
  chartColorValue,
  staggeredProgress,
  zeroAnchoredDomain,
} from '../../lib/chart';
import { useStrings } from '../../locale';
import { ChartLegend } from './ChartLegend';
import { EmptyState } from './EmptyState';
import './ParetoChart.css';

export interface ParetoPoint {
  key: string;
  label: string;
  x: number;
  y: number;
  /** Point fill, e.g. `cat-2` or a series token, to match the series elsewhere. */
  color?: ChartColor;
}

/** One series in the legend under the plot, e.g. a model and its colour. */
export interface ParetoLegendItem {
  key: string;
  label: ReactNode;
  /** Swatch fill; the same value its points use. */
  color?: ChartColor;
}

interface ParetoChartProps {
  points: ParetoPoint[];
  xLabel: string;
  yLabel: string;
  /** Which direction counts as better on each axis. */
  xDirection?: 'lower' | 'higher';
  yDirection?: 'lower' | 'higher';
  /** Formats the labels of each axis. */
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  /**
   * `log` spaces the horizontal axis by ratio, e.g. for a cost that spans
   * orders of magnitude; its values must be above 0. Defaults to `linear`.
   */
  xScale?: 'linear' | 'log';
  /** The ends of each axis. Defaults to from 0, or the data's own range on a log axis. */
  xDomain?: [number, number];
  yDomain?: [number, number];
  /**
   * The labelled gridlines of each axis. Defaults to plain gridlines with
   * labels at the two ends.
   */
  xTicks?: number[];
  yTicks?: number[];
  /**
   * Which points carry their name. `front` names the frontier; `all` names
   * every point, so the chart needs no legend. A plot too narrow for them
   * names the frontier and `highlightKeys` and lists every point under it.
   * Defaults to `front`.
   */
  labels?: 'front' | 'all';
  /** Fades the points off the frontier. Defaults to true. */
  fadeDominated?: boolean;
  /** Fades every other point, to pick out the ones a finding is about. */
  highlightKeys?: string[];
  /** The tallest the plot grows. */
  maxHeight?: number;
  onSelect?: (key: string) => void;
  /** Series swatches with labels, listed under the plot. */
  legend?: ParetoLegendItem[];
  /**
   * Shown in place of the plot, at its minimum height, while there are no
   * points — e.g. an EmptyState with an icon asking for both axes. Replaces
   * the default empty state built from `emptyTitle`.
   */
  empty?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * How far the chart is drawn, 0 to 1, for a chart that draws as its
   * section scrolls in (`useScrollProgress`): points fade in from left to
   * right, then the frontier. Omitted, they fade in once on mount.
   */
  progress?: number;
  /**
   * How far the frontier is traced, 0 to 1, for a host that draws it apart
   * from the points, such as one step of a scrolling story.
   */
  frontProgress?: number;
  className?: string;
}

// The SVG is drawn at its measured CSS width, so these are true px.
const MAX_HEIGHT = 320;
const MIN_HEIGHT = 220;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 28;
const PAD_BOTTOM = 44;
const POINT_RADIUS = 5;
const LABEL_GAP = 8;
const GRID_STEPS = 4;
// Estimates for placing labels: --fs-11 text, and the width below which
// `labels='all'` would crowd the plot.
const LABEL_CHAR = 6.2;
const LABEL_WIDE_CHAR = 11;
const LABEL_LINE = 14;
const ALL_LABELS_MIN_WIDTH = 520;

type Direction = 'lower' | 'higher';

function better(a: number, b: number, direction: Direction): boolean {
  return direction === 'lower' ? a < b : a > b;
}

interface LabelBox {
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

function labelWidth(text: string): number {
  return [...text].reduce(
    (sum, char) =>
      sum + ((char.codePointAt(0) ?? 0) > 255 ? LABEL_WIDE_CHAR : LABEL_CHAR),
    0,
  );
}

/**
 * Puts each label beside its point on the first side where it stays on the
 * plot and clear of the labels already placed and of the other points.
 */
function placeLabels(
  labelled: Array<{ key: string; label: string; x: number; y: number }>,
  allPoints: Array<{ x: number; y: number }>,
  bounds: { left: number; right: number; top: number; bottom: number },
): Map<string, LabelBox> {
  const placed: Array<{ l: number; r: number; t: number; b: number }> = [];
  const result = new Map<string, LabelBox>();
  const reach = POINT_RADIUS + LABEL_GAP / 2;
  for (const point of labelled) {
    const w = labelWidth(point.label);
    const candidates: LabelBox[] = [
      { x: point.x + reach, y: point.y + LABEL_LINE / 3, anchor: 'start' },
      { x: point.x - reach, y: point.y + LABEL_LINE / 3, anchor: 'end' },
      { x: point.x - w / 2, y: point.y - reach, anchor: 'start' },
      { x: point.x - w / 2, y: point.y + reach + LABEL_LINE, anchor: 'start' },
    ];
    const box = (candidate: LabelBox) => {
      const l = candidate.anchor === 'end' ? candidate.x - w : candidate.x;
      return {
        l,
        r: l + w,
        t: candidate.y - LABEL_LINE,
        b: candidate.y,
      };
    };
    const clear = (candidate: LabelBox): boolean => {
      const { l, r, t, b } = box(candidate);
      return (
        l >= bounds.left &&
        r <= bounds.right &&
        t >= bounds.top - LABEL_GAP &&
        b <= bounds.bottom &&
        placed.every(
          (other) => r < other.l || l > other.r || b < other.t || t > other.b,
        ) &&
        allPoints.every(
          (other) =>
            other.x === point.x ||
            other.x + POINT_RADIUS < l ||
            other.x - POINT_RADIUS > r ||
            other.y + POINT_RADIUS < t ||
            other.y - POINT_RADIUS > b,
        )
      );
    };
    const chosen = candidates.find(clear) ?? candidates[0];
    placed.push(box(chosen));
    result.set(point.key, chosen);
  }
  return result;
}

export function ParetoChart({
  points,
  xLabel,
  yLabel,
  xDirection = 'lower',
  yDirection = 'higher',
  formatX = String,
  formatY = String,
  xScale = 'linear',
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  labels = 'front',
  fadeDominated = true,
  highlightKeys,
  maxHeight = MAX_HEIGHT,
  onSelect,
  legend,
  empty,
  emptyTitle,
  emptyDescription,
  progress,
  frontProgress,
  className,
}: ParetoChartProps) {
  const strings = useStrings();
  const clipId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const cls = [
    'aegis-pareto',
    progress === undefined && frontProgress === undefined
      ? ''
      : 'aegis-pareto--scroll',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const geometry = useMemo(() => {
    if (points.length === 0 || width === 0) {
      return null;
    }
    const height = Math.round(
      Math.min(maxHeight, Math.max(MIN_HEIGHT, width / 2)),
    );
    const xValues = points.map((point) => point.x);
    const [xLo, xHi] =
      xDomain ??
      (xScale === 'log'
        ? ([Math.min(...xValues), Math.max(...xValues)] as const)
        : zeroAnchoredDomain(xValues));
    const [yLo, yHi] =
      yDomain ?? zeroAnchoredDomain(points.map((point) => point.y));
    const scaleX = xScale === 'log' ? Math.log10 : (value: number) => value;
    const left = PAD_LEFT;
    const right = width - PAD_RIGHT;
    const top = PAD_TOP;
    const bottom = height - PAD_BOTTOM;
    const sx = (value: number): number =>
      left +
      ((scaleX(value) - scaleX(xLo)) / (scaleX(xHi) - scaleX(xLo))) *
        (right - left);
    const sy = (value: number): number =>
      bottom - ((value - yLo) / (yHi - yLo)) * (bottom - top);
    const front = points
      .filter(
        (candidate) =>
          !points.some(
            (other) =>
              other.key !== candidate.key &&
              (better(other.x, candidate.x, xDirection) ||
                other.x === candidate.x) &&
              (better(other.y, candidate.y, yDirection) ||
                other.y === candidate.y) &&
              (better(other.x, candidate.x, xDirection) ||
                better(other.y, candidate.y, yDirection)),
          ),
      )
      .sort((a, b) => a.x - b.x);
    const steps = Array.from(
      { length: GRID_STEPS },
      (_, i) => (i + 1) / GRID_STEPS,
    );
    // Points draw in from left to right; the frontier comes last.
    const order = new Map(
      [...points]
        .sort((a, b) => sx(a.x) - sx(b.x))
        .map((point, rank) => [point.key, rank]),
    );
    return {
      height,
      order,
      left,
      right,
      top,
      bottom,
      sx,
      sy,
      front,
      frontKeys: new Set(front.map((point) => point.key)),
      gridX: xTicks?.map(sx) ?? steps.map((t) => sx(xLo + (xHi - xLo) * t)),
      gridY: yTicks?.map(sy) ?? steps.map((t) => sy(yLo + (yHi - yLo) * t)),
      xLabels: xTicks ?? [xLo, xHi],
      yLabels: yTicks ?? [yLo, yHi],
    };
  }, [
    points,
    width,
    xDirection,
    yDirection,
    xScale,
    xDomain,
    yDomain,
    xTicks,
    yTicks,
    maxHeight,
  ]);

  if (points.length === 0) {
    return (
      <div ref={wrapRef} className={cls}>
        {empty === undefined ? (
          <EmptyState
            title={emptyTitle ?? strings.paretoEmptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div
            className="aegis-pareto__empty"
            style={
              {
                '--aegis-pareto-min-height': `${MIN_HEIGHT.toString()}px`,
              } as CSSProperties
            }
          >
            {empty}
          </div>
        )}
      </div>
    );
  }

  if (!geometry) {
    return <div ref={wrapRef} className={cls} />;
  }

  const { height, left, right, top, bottom, sx, sy, front, frontKeys } =
    geometry;
  const highlighted =
    highlightKeys === undefined ? null : new Set(highlightKeys);
  const dimmed = (key: string): boolean =>
    highlighted !== null && !highlighted.has(key);
  const showAllLabels = labels === 'all' && width >= ALL_LABELS_MIN_WIDTH;
  const labelBoxes = placeLabels(
    points
      .filter(
        (point) =>
          showAllLabels ||
          frontKeys.has(point.key) ||
          (highlighted?.has(point.key) ?? false),
      )
      .map((point) => ({
        key: point.key,
        label: point.label,
        x: sx(point.x),
        y: sy(point.y),
      })),
    points.map((point) => ({ x: sx(point.x), y: sy(point.y) })),
    { left, right, top, bottom },
  );
  // A plot too narrow to name every point names them under it instead, so
  // none is left to a tooltip a phone cannot show.
  const legendItems =
    legend?.map((item) => ({
      key: item.key,
      label: item.label,
      color: item.color ?? ('var(--bg-inverted)' as const),
    })) ??
    (labels === 'all' && !showAllLabels
      ? points.map((point) => ({
          key: point.key,
          label: point.label,
          color: point.color ?? ('var(--bg-inverted)' as const),
        }))
      : []);
  const frontDrawn =
    frontProgress ??
    (progress === undefined
      ? undefined
      : staggeredProgress(progress, points.length, points.length + 1));
  const selectOnKey = (event: KeyboardEvent<SVGCircleElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(key);
    }
  };

  return (
    <div ref={wrapRef} className={cls}>
      <svg
        className="aegis-pareto__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width.toString()} ${height.toString()}`}
        role={onSelect ? 'group' : 'img'}
        aria-label={strings.paretoChartLabel(xLabel, yLabel)}
        style={
          {
            '--aegis-pareto-count': points.length,
            ...(frontDrawn === undefined
              ? {}
              : { '--aegis-pareto-front-progress': frontDrawn }),
          } as CSSProperties
        }
      >
        {geometry.gridY.map((y) => (
          <line
            key={`gy-${y.toString()}`}
            className="aegis-pareto__grid"
            x1={left}
            y1={y}
            x2={right}
            y2={y}
          />
        ))}
        {geometry.gridX.map((x) => (
          <line
            key={`gx-${x.toString()}`}
            className="aegis-pareto__grid"
            x1={x}
            y1={top}
            x2={x}
            y2={bottom}
          />
        ))}
        <line
          className="aegis-pareto__axis"
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
        />
        <line
          className="aegis-pareto__axis"
          x1={left}
          y1={top}
          x2={left}
          y2={bottom}
        />
        {frontDrawn !== undefined && (
          <clipPath id={clipId}>
            <rect
              x={left}
              y={0}
              width={(right - left) * frontDrawn}
              height={height}
            />
          </clipPath>
        )}
        {front.length > 1 && (
          <polyline
            className="aegis-pareto__front"
            clipPath={frontDrawn === undefined ? undefined : `url(#${clipId})`}
            points={front
              .map(
                (point) =>
                  `${sx(point.x).toString()},${sy(point.y).toString()}`,
              )
              .join(' ')}
          />
        )}
        {points.map((point, index) => (
          <circle
            key={point.key}
            className={[
              'aegis-pareto__point',
              fadeDominated && !frontKeys.has(point.key)
                ? 'aegis-pareto__point--dominated'
                : '',
              dimmed(point.key) ? 'aegis-pareto__point--dimmed' : '',
              onSelect ? 'aegis-pareto__point--interactive' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                fill:
                  point.color === undefined
                    ? undefined
                    : chartColorValue(point.color),
                '--aegis-pareto-index': index,
                '--aegis-pareto-point-progress':
                  progress === undefined
                    ? 1
                    : staggeredProgress(
                        progress,
                        geometry.order.get(point.key) ?? index,
                        points.length + 1,
                      ),
              } as CSSProperties
            }
            cx={sx(point.x)}
            cy={sy(point.y)}
            r={POINT_RADIUS}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? point.label : undefined}
            onClick={
              onSelect
                ? () => {
                    onSelect(point.key);
                  }
                : undefined
            }
            onKeyDown={
              onSelect
                ? (event) => {
                    selectOnKey(event, point.key);
                  }
                : undefined
            }
          >
            <title>{point.label}</title>
          </circle>
        ))}
        {points.map((point) => {
          const box = labelBoxes.get(point.key);
          return box === undefined ? null : (
            <text
              key={`label-${point.key}`}
              className={[
                'aegis-pareto__point-label',
                dimmed(point.key) ? 'aegis-pareto__point-label--dimmed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                labels === 'all'
                  ? ({
                      '--aegis-pareto-front-progress':
                        progress === undefined
                          ? 1
                          : staggeredProgress(
                              progress,
                              geometry.order.get(point.key) ?? 0,
                              points.length + 1,
                            ),
                    } as CSSProperties)
                  : undefined
              }
              x={box.x}
              y={box.y}
              textAnchor={box.anchor}
            >
              {point.label}
            </text>
          );
        })}
        {geometry.xLabels.map((value, index) => (
          <text
            key={`x-${value.toString()}`}
            className="aegis-pareto__tick"
            x={sx(value)}
            y={bottom + LABEL_GAP * 2}
            textAnchor={
              index === geometry.xLabels.length - 1 && sx(value) >= right - 1
                ? 'end'
                : 'middle'
            }
          >
            {formatX(value)}
          </text>
        ))}
        {geometry.yLabels.map((value) => (
          <text
            key={`y-${value.toString()}`}
            className="aegis-pareto__tick"
            x={left - LABEL_GAP}
            y={sy(value)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatY(value)}
          </text>
        ))}
        <text
          className="aegis-pareto__axis-label"
          x={right}
          y={height - LABEL_GAP}
          textAnchor="end"
        >
          {xLabel}
        </text>
        <text
          className="aegis-pareto__axis-label"
          x={left - LABEL_GAP}
          y={top - LABEL_GAP * 2}
          textAnchor="start"
        >
          {yLabel}
        </text>
      </svg>
      {legendItems.length > 0 ? (
        <ChartLegend
          className="aegis-pareto__legend"
          shape="dot"
          items={legendItems}
        />
      ) : null}
    </div>
  );
}
