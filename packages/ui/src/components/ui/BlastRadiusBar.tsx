import { useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './BlastRadiusBar.css';

export interface BlastRadiusBarSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    value: number;
    centerLabel?: string;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface BlastRadiusBarProps {
  /** 0 – 100 */
  value: number;
  /** Optional descriptive label for the current value (right-aligned, mid). */
  centerLabel?: string;
  /** Hide the 0 / 100 endpoints. */
  hideTicks?: boolean;
  className?: string;
  surface?: BlastRadiusBarSurface;
}

export function BlastRadiusBar({
  value,
  centerLabel,
  hideTicks = false,
  className,
  surface,
}: BlastRadiusBarProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<{ value: number; centerLabel?: string }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'metric',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { value, centerLabel },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const clamped = Math.max(0, Math.min(100, value));
  const cls = ['aegis-blast-radius', className ?? ''].filter(Boolean).join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      <div
        className="aegis-blast-radius__track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="aegis-blast-radius__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {!hideTicks && (
        <div className="aegis-blast-radius__ticks">
          <span className="aegis-blast-radius__tick">0%</span>
          {centerLabel && (
            <span className="aegis-blast-radius__tick aegis-blast-radius__tick--center">
              {centerLabel}
            </span>
          )}
          <span className="aegis-blast-radius__tick">100%</span>
        </div>
      )}
    </div>
  );
}

export default BlastRadiusBar;
