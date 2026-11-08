import { type ReactNode, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { formatDuration } from '../../lib/format';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { Markdown } from './Markdown';
import { MetricLabel } from './MetricLabel';
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
      <MetricLabel size="xs">{label}</MetricLabel>
      <div className="aegis-step__section-body">{children}</div>
    </div>
  );
}

const FENCE = /^(`{3,}|~{3,})/;

// A delimiter run opens after whitespace or an opening bracket or quote and
// closes before whitespace or trailing punctuation, so the underscores in
// snake_case and src/__init__.py stay as they are.
const EMPHASIS = ['\\*\\*', '__', '\\*', '_'].map(
  (delimiter) =>
    new RegExp(
      `(^|[\\s([{"'])${delimiter}(\\S(?:.*?\\S)?)${delimiter}(?=[.,;:!?)\\]}"']*(?:\\s|$))`,
      'g',
    ),
);

// Stands in for a code span while the syntax around it is removed, so
// emphasis or a link may wrap code and the code itself is left alone.
const CODE_MARK = '\uE000';
const CODE_SPAN = /`([^`]+)`/g;
const MARKED_CODE = new RegExp(`${CODE_MARK}(\\d+)${CODE_MARK}`);

/**
 * The first line of an action written in Markdown, as the head shows it.
 * A heading, quote or list marker is dropped; a link gives way to its text,
 * and `**`, `__`, `*` and `_` emphasis to the text it wraps; a code span is
 * set in the code face. An action that opens with a fenced code block shows
 * the block's first line of code, in the code face, and nothing when the
 * block is empty.
 */
function actionPreview(markdown: string): ReactNode {
  const lines = markdown.trim().split('\n');
  const fence = FENCE.exec(lines[0])?.[1];
  if (fence !== undefined) {
    const close = new RegExp(`^\\s*${fence[0]}{${String(fence.length)},}\\s*$`);
    const end = lines.findIndex((line, index) => index > 0 && close.test(line));
    const code = lines
      .slice(1, end === -1 ? undefined : end)
      .find((line) => line.trim() !== '');
    return code === undefined ? undefined : (
      <code className="aegis-step__action-code">{code.trim()}</code>
    );
  }
  const codes: string[] = [];
  const masked = lines[0]
    .replace(/^(#+|>|[-*+]|\d+\.)\s+/, '')
    .replace(CODE_SPAN, (_span, code: string) => {
      codes.push(code);
      return `${CODE_MARK}${String(codes.length - 1)}${CODE_MARK}`;
    });
  const text = EMPHASIS.reduce(
    (current, pattern) => current.replace(pattern, '$1$2'),
    masked.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'),
  );
  return text.split(MARKED_CODE).map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className="aegis-step__action-code">
        {codes[Number(part)]}
      </code>
    ) : (
      part
    ),
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
  const summary =
    data.summary ?? (data.action ? actionPreview(data.action) : undefined);
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
            {String(data.step).padStart(2, '0')}
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
            <MetricLabel size="xs" className="aegis-step__meta-number">
              {formatDuration(data.durationMs)}
            </MetricLabel>
          )}
          {data.timestamp && (
            <MetricLabel size="xs" className="aegis-step__meta-number">
              {data.timestamp}
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
