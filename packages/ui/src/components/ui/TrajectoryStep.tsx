import { type ReactNode, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { Markdown } from './Markdown';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';
import { ToolCallCard, type ToolCallData } from './ToolCallCard';
import './TrajectoryStep.css';

/** A labelled text of a step beyond its thought, action and observation. */
export interface TrajectoryStepSection {
  label: string;
  text: string;
  /** `text` keeps the text as recorded, preformatted and scrolling past a cap. */
  format?: 'markdown' | 'text';
}

export interface TrajectoryStepData {
  step: number;
  timestamp?: string;
  durationMs?: number;
  /** The head's one-line preview; defaults to `action`. */
  summary?: string;
  thought?: string;
  action?: string;
  actionType?: 'tool_call' | 'message' | 'internal';
  toolCall?: ToolCallData;
  /** Further calls of the step, each a card after `toolCall`. */
  toolCalls?: ToolCallData[];
  observation?: string;
  /** Shown after the thought and action, before the tool calls. */
  sections?: TrajectoryStepSection[];
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
  const strings = useStrings();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toolCalls = [
    ...(data.toolCall ? [data.toolCall] : []),
    ...(data.toolCalls ?? []),
  ];
  const sections = data.sections ?? [];
  const summary = data.summary ?? data.action;
  const hasBody =
    [data.thought, data.action, data.observation].some(Boolean) ||
    toolCalls.length > 0 ||
    sections.length > 0;

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
            <Chip tone={actionTone}>
              {strings.trajectoryActionType(data.actionType)}
            </Chip>
          ) : (
            <StatusDot size={6} />
          )}
          {summary && (
            <span className="aegis-step__action-preview">{summary}</span>
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
            <StepSection label={strings.trajectoryThought}>
              <Markdown>{data.thought}</Markdown>
            </StepSection>
          )}
          {data.action && (
            <StepSection label={strings.trajectoryAction}>
              <Markdown>{data.action}</Markdown>
            </StepSection>
          )}
          {sections.map((section, index) => (
            <StepSection key={index} label={section.label}>
              {section.format === 'text' ? (
                <pre className="aegis-step__text">{section.text}</pre>
              ) : (
                <Markdown>{section.text}</Markdown>
              )}
            </StepSection>
          ))}
          {toolCalls.length > 0 && (
            <StepSection label={strings.trajectoryTool}>
              <div className="aegis-step__tools">
                {toolCalls.map((call, index) => (
                  <ToolCallCard key={index} data={call} />
                ))}
              </div>
            </StepSection>
          )}
          {data.observation && (
            <StepSection label={strings.trajectoryObservation}>
              <Markdown>{data.observation}</Markdown>
            </StepSection>
          )}
        </div>
      )}
    </article>
  );
}
