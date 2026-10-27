import { type CSSProperties, type KeyboardEvent, useMemo, useRef } from 'react';

import { useElementWidth } from '../../hooks/useElementWidth';
import { useStrings } from '../../locale';
import { EmptyState } from './EmptyState';
import './ParetoChart.css';

export interface ParetoPoint {
  key: string;
  label: string;
  x: number;
  y: number;
  /** Point fill, e.g. `var(--data-cat-2)` to match the series elsewhere. */
  color?: string;
}

interface ParetoChartProps {
  points: ParetoPoint[];
  xLabel: string;
  yLabel: string;
  /** Which direction counts as better on each axis. */
  xDirection?: 'lower' | 'higher';
  yDirection?: 'lower' | 'higher';
  /** Formats the 0 and maximum labels of each axis. */
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  onSelect?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
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

type Direction = 'lower' | 'higher';

function better(a: number, b: number, direction: Direction): boolean {
  return direction === 'lower' ? a < b : a > b;
}

/** Axis span from 0 (or the data minimum when negative) to the maximum. */
function zeroAnchoredDomain(values: number[]): [number, number] {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  return hi === lo ? [lo, lo + 1] : [lo, hi];
}

export function ParetoChart({
  points,
  xLabel,
  yLabel,
  xDirection = 'lower',
  yDirection = 'higher',
  formatX = String,
  formatY = String,
  onSelect,
  emptyTitle,
  emptyDescription,
  className,
}: ParetoChartProps) {
  const strings = useStrings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const cls = ['aegis-pareto', className ?? ''].filter(Boolean).join(' ');

  const geometry = useMemo(() => {
    if (points.length === 0 || width === 0) {
      return null;
    }
    const height = Math.round(
      Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, width / 2)),
    );
    const [xLo, xHi] = zeroAnchoredDomain(points.map((point) => point.x));
    const [yLo, yHi] = zeroAnchoredDomain(points.map((point) => point.y));
    const left = PAD_LEFT;
    const right = width - PAD_RIGHT;
    const top = PAD_TOP;
    const bottom = height - PAD_BOTTOM;
    const sx = (value: number): number =>
      left + ((value - xLo) / (xHi - xLo)) * (right - left);
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
    return {
      height,
      left,
      right,
      top,
      bottom,
      sx,
      sy,
      front,
      frontKeys: new Set(front.map((point) => point.key)),
      gridX: steps.map((t) => sx(xLo + (xHi - xLo) * t)),
      gridY: steps.map((t) => sy(yLo + (yHi - yLo) * t)),
      xLo,
      xHi,
      yLo,
      yHi,
    };
  }, [points, width, xDirection, yDirection]);

  if (points.length === 0) {
    return (
      <div ref={wrapRef} className={cls}>
        <EmptyState
          title={emptyTitle ?? strings.paretoEmptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  if (!geometry) {
    return <div ref={wrapRef} className={cls} />;
  }

  const { height, left, right, top, bottom, sx, sy, front, frontKeys } =
    geometry;
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
        style={{ '--aegis-pareto-count': points.length } as CSSProperties}
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
        {front.length > 1 && (
          <polyline
            className="aegis-pareto__front"
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
              frontKeys.has(point.key) ? '' : 'aegis-pareto__point--dominated',
              onSelect ? 'aegis-pareto__point--interactive' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                fill: point.color,
                '--aegis-pareto-index': index,
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
        {front.map((point) => {
          const x = sx(point.x);
          const y = sy(point.y);
          const flip = x > left + (right - left) * 0.7;
          return (
            <text
              key={`label-${point.key}`}
              className="aegis-pareto__point-label"
              x={flip ? x - LABEL_GAP : x + LABEL_GAP}
              y={y < top + LABEL_GAP * 2 ? y + LABEL_GAP * 2 : y - LABEL_GAP}
              textAnchor={flip ? 'end' : 'start'}
            >
              {point.label}
            </text>
          );
        })}
        <text
          className="aegis-pareto__tick"
          x={left}
          y={bottom + LABEL_GAP * 2}
          textAnchor="middle"
        >
          {formatX(geometry.xLo)}
        </text>
        <text
          className="aegis-pareto__tick"
          x={right}
          y={bottom + LABEL_GAP * 2}
          textAnchor="end"
        >
          {formatX(geometry.xHi)}
        </text>
        <text
          className="aegis-pareto__tick"
          x={left - LABEL_GAP}
          y={bottom}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {formatY(geometry.yLo)}
        </text>
        <text
          className="aegis-pareto__tick"
          x={left - LABEL_GAP}
          y={top}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {formatY(geometry.yHi)}
        </text>
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
    </div>
  );
}
