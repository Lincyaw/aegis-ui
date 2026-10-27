import { useMemo } from 'react';

import { EmptyState } from './EmptyState';
import './ParetoChart.css';

export interface ParetoPoint {
  key: string;
  label: string;
  x: number;
  y: number;
}

interface ParetoChartProps {
  points: ParetoPoint[];
  xLabel: string;
  yLabel: string;
  /** Which direction counts as better on each axis. */
  xDirection?: 'lower' | 'higher';
  yDirection?: 'lower' | 'higher';
  onSelect?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

export function ParetoChart({
  points,
  xLabel,
  yLabel,
  xDirection = 'lower',
  yDirection = 'higher',
  onSelect,
  emptyTitle = '未配置指标',
  emptyDescription,
  className,
}: ParetoChartProps) {
  const cls = ['aegis-pareto', className ?? ''].filter(Boolean).join(' ');

  const geometry = useMemo(() => {
    if (points.length === 0) {
      return null;
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const span = (values: number[]): [number, number] => {
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      if (lo === hi) {
        return [lo - 1, hi + 1];
      }
      return [lo, hi];
    };
    const [xMin, xMax] = span(xs);
    const [yMin, yMax] = span(ys);
    const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const sx = (value: number): number =>
      PAD_LEFT + ((value - xMin) / (xMax - xMin)) * plotWidth;
    const sy = (value: number): number =>
      VIEW_HEIGHT - PAD_BOTTOM - ((value - yMin) / (yMax - yMin)) * plotHeight;
    const better = (
      a: number,
      b: number,
      direction: 'lower' | 'higher',
    ): boolean => (direction === 'lower' ? a < b : a > b);
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
      .sort((a, b) => sx(a.x) - sx(b.x));
    return {
      sx,
      sy,
      front,
      xMin,
      xMax,
      yMin,
      yMax,
    };
  }, [points, xDirection, yDirection]);

  if (!geometry) {
    return (
      <div className={cls}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  const { sx, sy, front, xMin, xMax, yMin, yMax } = geometry;
  const frontPath = front
    .map((point) => `${sx(point.x).toString()},${sy(point.y).toString()}`)
    .join(' ');

  return (
    <div className={cls}>
      <svg
        className="aegis-pareto__svg"
        viewBox={`0 0 ${VIEW_WIDTH.toString()} ${VIEW_HEIGHT.toString()}`}
        role="img"
        aria-label={`${yLabel} 对 ${xLabel} 的帕累托前沿`}
      >
        <line
          className="aegis-pareto__axis"
          x1={PAD_LEFT}
          y1={VIEW_HEIGHT - PAD_BOTTOM}
          x2={VIEW_WIDTH - PAD_RIGHT}
          y2={VIEW_HEIGHT - PAD_BOTTOM}
        />
        <line
          className="aegis-pareto__axis"
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={VIEW_HEIGHT - PAD_BOTTOM}
        />
        {front.length > 1 && (
          <polyline className="aegis-pareto__front" points={frontPath} />
        )}
        {points.map((point) => (
          <circle
            key={point.key}
            className={[
              'aegis-pareto__point',
              onSelect ? 'aegis-pareto__point--interactive' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            cx={sx(point.x)}
            cy={sy(point.y)}
            r={5}
            onClick={
              onSelect
                ? () => {
                    onSelect(point.key);
                  }
                : undefined
            }
          >
            <title>{point.label}</title>
          </circle>
        ))}
        <text
          className="aegis-pareto__tick"
          x={PAD_LEFT}
          y={VIEW_HEIGHT - PAD_BOTTOM + 14}
          textAnchor="middle"
        >
          {xMin}
        </text>
        <text
          className="aegis-pareto__tick"
          x={VIEW_WIDTH - PAD_RIGHT}
          y={VIEW_HEIGHT - PAD_BOTTOM + 14}
          textAnchor="middle"
        >
          {xMax}
        </text>
        <text
          className="aegis-pareto__tick"
          x={PAD_LEFT - 8}
          y={VIEW_HEIGHT - PAD_BOTTOM}
          textAnchor="end"
        >
          {yMin}
        </text>
        <text
          className="aegis-pareto__tick"
          x={PAD_LEFT - 8}
          y={PAD_TOP + 10}
          textAnchor="end"
        >
          {yMax}
        </text>
        <text
          className="aegis-pareto__axis-label"
          x={VIEW_WIDTH - PAD_RIGHT}
          y={VIEW_HEIGHT - 6}
          textAnchor="end"
        >
          {xLabel}
        </text>
        <text
          className="aegis-pareto__axis-label"
          x={PAD_LEFT - 8}
          y={PAD_TOP - 4}
          textAnchor="start"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
}
