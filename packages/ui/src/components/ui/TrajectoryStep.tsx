import { type ReactNode, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { Chip } from './Chip';
import { Markdown } from './Markdown';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';
import { ToolCallCard, type ToolCallData } from './ToolCallCard';
import './TrajectoryStep.css';

export interface TrajectoryStepData {
  step: number;
  timestamp?: string;
  durationMs?: number;
  thought?: string;
  action?: string;
  actionType?: 'tool_call' | 'message' | 'internal';
  toolCall?: ToolCallData;
  observation?: string;
}

export type TrajectoryStepSurface = PrimitiveSurface<TrajectoryStepData>;

interface TrajectoryStepProps {
  data: TrajectoryStepData;
  defaultExpanded?: boolean;
  className?: string;
  surface?: TrajectoryStepSurface;
}

function StepSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="aegis-step__section">
      <MetricLabel size="xs" className="aegis-step__section-label">
        {label}
      </MetricLabel>
      <div className="aegis-step__section-body">{children}</div>
    </div>
  );
}

export function TrajectoryStep({
  data,
  defaultExpanded = false,
  className,
  surface,
}: TrajectoryStepProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, data, 'detail', wrapRef);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasBody = Boolean(
    data.thought ?? data.action ?? data.observation ?? data.toolCall,
  );

  const actionTone =
    data.actionType === 'tool_call'
      ? 'ink'
      : data.actionType === 'internal'
        ? 'ghost'
        : 'default';

  const cls = [
    'aegis-step',
    expanded ? 'aegis-step--expanded' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article ref={wrapRef} className={cls} {...agentAttrs}>
      <button
        type="button"
        className="aegis-step__head"
        onClick={() => hasBody && setExpanded((e) => !e)}
        disabled={!hasBody}
        aria-expanded={expanded}
      >
        <div className="aegis-step__head-left">
          <span className="aegis-step__number">
            <MonoValue size="sm" weight="medium">
              {String(data.step).padStart(2, '0')}
            </MonoValue>
          </span>
          {data.actionType ? (
            <Chip tone={actionTone}>{data.actionType}</Chip>
          ) : (
            <StatusDot size={6} />
          )}
          {data.action && (
            <span className="aegis-step__action-preview">{data.action}</span>
          )}
        </div>
        <div className="aegis-step__head-right">
          {data.durationMs !== undefined && (
            <MetricLabel size="xs">
              <MonoValue size="sm" weight="regular">
                {data.durationMs}
              </MonoValue>{' '}
              ms
            </MetricLabel>
          )}
          {data.timestamp && (
            <MetricLabel size="xs">
              <MonoValue size="sm" weight="regular">
                {data.timestamp}
              </MonoValue>
            </MetricLabel>
          )}
          {hasBody && (
            <span className="aegis-step__chevron" aria-hidden="true">
              {expanded ? '▾' : '▸'}
            </span>
          )}
        </div>
      </button>

      {expanded && hasBody && (
        <div className="aegis-step__body">
          {data.thought && (
            <StepSection label="thought">
              <Markdown>{data.thought}</Markdown>
            </StepSection>
          )}
          {data.action && (
            <StepSection label="action">
              <Markdown>{data.action}</Markdown>
            </StepSection>
          )}
          {data.toolCall && (
            <StepSection label="tool">
              <ToolCallCard data={data.toolCall} />
            </StepSection>
          )}
          {data.observation && (
            <StepSection label="observation">
              <Markdown>{data.observation}</Markdown>
            </StepSection>
          )}
        </div>
      )}
    </article>
  );
}
