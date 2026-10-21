import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './StatBlock.css';

export type StatBlockSurface = PrimitiveSurface<{
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
}>;

interface StatBlockProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional unit displayed after the value. */
  unit?: ReactNode;
  /** Layout direction. Default: horizontal (label · value, baseline). */
  direction?: 'horizontal' | 'vertical';
  /** Use the larger 18 px mono variant. */
  emphasized?: boolean;
  inverted?: boolean;
  className?: string;
  surface?: StatBlockSurface;
}

export function StatBlock({
  label,
  value,
  unit,
  direction = 'horizontal',
  emphasized = false,
  inverted = false,
  className,
  surface,
}: StatBlockProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { label, value, unit },
    'metric',
    wrapRef,
  );
  const cls = [
    'aegis-stat',
    `aegis-stat--${direction}`,
    inverted ? 'aegis-stat--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <MetricLabel inverted={inverted} className="aegis-stat__label">
        {label}
      </MetricLabel>
      <span className="aegis-stat__value">
        <MonoValue size={emphasized ? 'lg' : 'sm'} inverted={inverted}>
          {value}
        </MonoValue>
        {unit && (
          <span className="aegis-stat__unit">
            <MetricLabel inverted={inverted}>{unit}</MetricLabel>
          </span>
        )}
      </span>
    </div>
  );
}
