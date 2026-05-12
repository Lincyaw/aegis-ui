import { useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './SparkLine.css';

export interface SparkLineSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (points: number[]) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface SparkLineProps {
  /** Sample values; rendered evenly on the X axis. */
  points: number[];
  /** Display dimensions (defaults give a strip-style sparkline). */
  width?: number;
  height?: number;
  /** Stroke thickness. */
  strokeWidth?: number;
  /** Gradient backdrop (panel → page). */
  withBackdrop?: boolean;
  /** Use white stroke for inverted panels. */
  inverted?: boolean;
  className?: string;
  ariaLabel?: string;
  surface?: SparkLineSurface;
}

function buildPath(points: number[], w: number, h: number): string {
  if (points.length === 0) {
    return '';
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;

  return points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function SparkLine({
  points,
  width = 100,
  height = 40,
  strokeWidth = 1.5,
  withBackdrop = true,
  inverted = false,
  className,
  ariaLabel = 'sparkline',
  surface,
}: SparkLineProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  useAegisSurface<number[]>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'chart',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: points,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const path = buildPath(points, width, height);
  const cls = [
    'aegis-sparkline',
    inverted ? 'aegis-sparkline--inverted' : '',
    withBackdrop ? 'aegis-sparkline--backdrop' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      ref={wrapRef}
      className={cls}
      aria-label={ariaLabel}
      role="img"
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="aegis-sparkline__svg"
      >
        <path
          d={path}
          className="aegis-sparkline__line"
          strokeWidth={strokeWidth}
        />
      </svg>
    </span>
  );
}

export default SparkLine;
