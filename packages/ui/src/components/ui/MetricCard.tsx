import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './MetricCard.css';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import { SparkLine } from './SparkLine';

export type MetricCardSurface = PrimitiveSurface<{
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
}>;

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional small unit appended after the main value. */
  unit?: ReactNode;
  /** Optional sparkline samples — drawn beneath the value. */
  sparkline?: number[];
  /** Sparkline-only height in px. */
  sparklineHeight?: number;
  inverted?: boolean;
  className?: string;
  onClick?: () => void;
  surface?: MetricCardSurface;
}

export function MetricCard({
  label,
  value,
  unit,
  sparkline,
  sparklineHeight = 60,
  inverted = false,
  className,
  onClick,
  surface,
}: MetricCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { label, value, unit },
    'metric',
    wrapRef,
  );
  const cls = [
    'aegis-metric-card',
    inverted ? 'aegis-metric-card--inverted' : '',
    onClick ? 'aegis-metric-card--clickable' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const interactive = Boolean(onClick);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!onClick) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <div
      ref={wrapRef}
      className={cls}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...agentAttrs}
    >
      <MetricLabel inverted={inverted}>{label}</MetricLabel>
      <div className="aegis-metric-card__value">
        <MonoValue size="lg" inverted={inverted}>
          {value}
        </MonoValue>
        {unit && (
          <MetricLabel inverted={inverted} className="aegis-metric-card__unit">
            {unit}
          </MetricLabel>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div
          className="aegis-metric-card__chart"
          style={{ height: sparklineHeight }}
        >
          <SparkLine points={sparkline} inverted={inverted} />
        </div>
      )}
    </div>
  );
}
