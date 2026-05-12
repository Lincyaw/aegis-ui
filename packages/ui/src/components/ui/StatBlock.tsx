import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './StatBlock.css';

export interface StatBlockSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    label: ReactNode;
    value: ReactNode;
    unit?: ReactNode;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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
  useAegisSurface<{ label: ReactNode; value: ReactNode; unit?: ReactNode }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'metric',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { label, value, unit },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const cls = [
    'aegis-stat',
    `aegis-stat--${direction}`,
    inverted ? 'aegis-stat--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
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

export default StatBlock;
