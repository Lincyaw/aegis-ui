import { useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './BlastRadiusBar.css';

export type BlastRadiusBarSurface = PrimitiveSurface<{
  value: number;
  centerLabel?: string;
}>;

interface BlastRadiusBarBaseProps {
  /** 0 – 100 */
  value: number;
  /** Optional descriptive label for the current value (right-aligned, mid). */
  centerLabel?: string;
  /** Hide the 0 / 100 endpoints. */
  hideTicks?: boolean;
  /** Ids of the text that describes the measure, such as a FormRow's description. */
  'aria-describedby'?: string;
  className?: string;
  surface?: BlastRadiusBarSurface;
}

type BlastRadiusBarProps = BlastRadiusBarBaseProps &
  (
    | {
        /** Accessible name of the measure, e.g. "Estimated blast radius". */
        ariaLabel: string;
        'aria-labelledby'?: never;
      }
    | {
        /**
         * Id of visible text that names the measure, such as a FormRow's
         * label (`${controlId}-label` with `labelBy='aria-labelledby'`).
         */
        'aria-labelledby': string;
        ariaLabel?: never;
      }
  );

export function BlastRadiusBar({
  value,
  ariaLabel,
  'aria-labelledby': labelledBy,
  centerLabel,
  hideTicks = false,
  'aria-describedby': describedBy,
  className,
  surface,
}: BlastRadiusBarProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { value, centerLabel },
    'metric',
    wrapRef,
  );
  const clamped = Math.max(0, Math.min(100, value));
  const cls = ['aegis-blast-radius', className ?? ''].filter(Boolean).join(' ');

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <div
        className="aegis-blast-radius__track"
        role="meter"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={centerLabel ?? `${clamped.toString()}%`}
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
