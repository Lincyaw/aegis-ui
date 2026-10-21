import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { Chip } from './Chip';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';
import { TrajectoryStep, type TrajectoryStepData } from './TrajectoryStep';
import './TrajectoryTimeline.css';

export type TrajectoryTimelineSurface = PrimitiveSurface<TrajectoryStepData[]>;

export interface TrajectoryTimelineProps {
  steps: TrajectoryStepData[];
  agentName?: string;
  status?: 'running' | 'completed' | 'failed';
  totalDurationMs?: number;
  extra?: ReactNode;
  className?: string;
  surface?: TrajectoryTimelineSurface;
}

export function TrajectoryTimeline({
  steps,
  agentName,
  status = 'running',
  totalDurationMs,
  extra,
  className,
  surface,
}: TrajectoryTimelineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, steps, 'timeline', wrapRef);
  const cls = ['aegis-trajectory-timeline', className ?? '']
    .filter(Boolean)
    .join(' ');

  const statusTone = status === 'failed' ? 'warning' : 'ink';
  const pulse = status === 'running';

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <header className="aegis-trajectory-timeline__header">
        <div className="aegis-trajectory-timeline__header-left">
          <StatusDot tone={statusTone} pulse={pulse} />
          {agentName ? (
            <span className="aegis-trajectory-timeline__agent-name">
              {agentName}
            </span>
          ) : (
            <MetricLabel size="sm">agent trajectory</MetricLabel>
          )}
          <Chip tone={status === 'failed' ? 'warning' : 'default'}>
            {status}
          </Chip>
        </div>
        <div className="aegis-trajectory-timeline__header-right">
          {totalDurationMs !== undefined && (
            <MetricLabel size="sm">
              <MonoValue size="sm" weight="regular">
                {totalDurationMs}
              </MonoValue>{' '}
              ms
            </MetricLabel>
          )}
          {extra}
        </div>
      </header>

      <div className="aegis-trajectory-timeline__track">
        {steps.map((step, i) => (
          <TrajectoryStep
            key={step.step}
            data={step}
            defaultExpanded={i === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
