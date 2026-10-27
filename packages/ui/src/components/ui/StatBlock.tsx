import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { useCountUp } from '../../hooks/useCountUp';
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
  /**
   * When `value` is a number, counts it up from 0 once on mount (about
   * 600 ms, easing out, keeping its decimal places). Shows the final value
   * at once under prefers-reduced-motion.
   */
  animateValue?: boolean;
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
  animateValue = false,
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
  const numeric = typeof value === 'number';
  const counted = useCountUp(numeric ? value : 0, animateValue && numeric);
  const shown =
    animateValue && numeric
      ? counted.toFixed((String(value).split('.')[1] ?? '').length)
      : value;
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
          {shown}
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
