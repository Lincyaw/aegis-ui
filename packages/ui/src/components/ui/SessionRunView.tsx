import { type ReactElement, type ReactNode } from 'react';

import { FullscreenOutlined } from '@ant-design/icons';

import { Button } from './Button';
import { Chip } from './Chip';
import {
  type InspectableContent,
  prepareInspectableContent,
} from './ContentInspectorContent';
import { ContentPreview } from './ContentInspectorDialog';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './SessionRunView.css';
import { TimeDisplay } from './TimeDisplay';

const EXCERPT_LIMIT = 140;

export interface SessionRunMessage {
  id?: string;
  role: string;
  content: unknown[];
  highlighted?: boolean;
}

export interface SessionRunSummary {
  lineage: string;
  startedAt: string;
  inputTokens: string;
  outputTokens: string;
}

export interface SessionRunFact {
  key: string;
  label: string;
  value: ReactNode;
}

export interface SessionRunToolCall {
  id: string;
  tool: string;
  duration: string;
  args: unknown;
  result: unknown;
  errored?: boolean;
}

export interface SessionRunSubmission {
  tool: string;
  payload: unknown;
  result: unknown;
  summary: string;
}

export interface SessionRunTrajectoryViewProps {
  summary: SessionRunSummary;
  messages: SessionRunMessage[];
  loading?: boolean;
  error?: string;
  onInspectContent: (content: InspectableContent) => void;
}

export interface SessionRunOutputViewProps {
  facts: SessionRunFact[];
  acceptedSubmission?: SessionRunSubmission | null;
  tools: SessionRunToolCall[];
  loading?: boolean;
  error?: string;
  onInspectContent: (content: InspectableContent) => void;
}

function contentExcerpt(message: SessionRunMessage): string {
  for (const block of message.content) {
    if (block != null && typeof block === 'object') {
      const obj = block as Record<string, unknown>;
      if (obj.type === 'text' && typeof obj.text === 'string') {
        const text = obj.text.trim().replace(/\s+/g, ' ');
        return text.length > EXCERPT_LIMIT
          ? `${text.slice(0, EXCERPT_LIMIT)}…`
          : text;
      }
      if (obj.type === 'tool_call' && typeof obj.name === 'string') {
        return `→ ${obj.name}`;
      }
      if (obj.type === 'tool_result') {
        return '⇐ tool result';
      }
    }
  }
  return '';
}

function blockTitle(block: Record<string, unknown>): string {
  if (typeof block.name === 'string') {
    return block.name;
  }
  if (typeof block.type === 'string') {
    return block.type;
  }
  return 'content';
}

function messageInspectContent(message: SessionRunMessage): InspectableContent {
  const textBlocks = message.content
    .map((block) => {
      if (block != null && typeof block === 'object') {
        const obj = block as Record<string, unknown>;
        if (obj.type === 'text' && typeof obj.text === 'string') {
          return obj.text;
        }
      }
      return null;
    })
    .filter((text): text is string => text !== null);
  if (textBlocks.length > 0 && textBlocks.length === message.content.length) {
    return {
      title: `${message.role} message`,
      value: textBlocks.join('\n\n'),
    };
  }
  return {
    title: `${message.role} message`,
    value: {
      role: message.role,
      content: message.content,
    },
    kind: 'json',
  };
}

function InspectContentButton({
  content,
  onInspectContent,
}: {
  content: InspectableContent;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  return (
    <Button
      type="button"
      tone="ghost"
      className="aegis-session-content__expand"
      aria-label={`Open ${content.title}`}
      title="Open in inspector"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onInspectContent(content);
      }}
    >
      <FullscreenOutlined />
      Open
    </Button>
  );
}

function InspectableRunContent({
  content,
  onInspectContent,
  showHeader = true,
}: {
  content: InspectableContent;
  onInspectContent: (content: InspectableContent) => void;
  showHeader?: boolean;
}): ReactElement {
  const prepared = prepareInspectableContent(content);
  return (
    <div
      className={`aegis-session-content aegis-session-content--${prepared.kind}`}
    >
      {showHeader && (
        <div className="aegis-session-content__toolbar">
          <span className="aegis-session-content__title">{content.title}</span>
          <MetricLabel size="xs">{prepared.kind}</MetricLabel>
          <InspectContentButton
            content={content}
            onInspectContent={onInspectContent}
          />
        </div>
      )}
      <ContentPreview content={content} />
    </div>
  );
}

function MessageTextBlock({
  title,
  text,
  onInspectContent,
}: {
  title: string;
  text: string;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  return (
    <InspectableRunContent
      content={{ title, value: text }}
      onInspectContent={onInspectContent}
    />
  );
}

function MessageBlock({
  block,
  title,
  onInspectContent,
}: {
  block: unknown;
  title: string;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  if (block == null || typeof block !== 'object') {
    return (
      <InspectableRunContent
        content={{ title, value: block }}
        onInspectContent={onInspectContent}
      />
    );
  }
  const obj = block as Record<string, unknown>;
  if (obj.type === 'text' && typeof obj.text === 'string') {
    return (
      <MessageTextBlock
        title={title}
        text={obj.text}
        onInspectContent={onInspectContent}
      />
    );
  }
  const content = {
    title: blockTitle(obj),
    value: obj,
    kind: 'json' as const,
  };
  return (
    <details className="aegis-session-message__tool">
      <summary>
        <span>{String(obj.type ?? 'block')}</span>
        <MonoValue size="sm">{blockTitle(obj)}</MonoValue>
        <InspectContentButton
          content={content}
          onInspectContent={onInspectContent}
        />
      </summary>
      <InspectableRunContent
        content={content}
        onInspectContent={onInspectContent}
        showHeader={false}
      />
    </details>
  );
}

function MessageCard({
  message,
  onInspectContent,
}: {
  message: SessionRunMessage;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  const content = messageInspectContent(message);
  const collapseByDefault =
    message.role === 'system' || message.role === 'user';
  return (
    <details
      open={!collapseByDefault}
      className={`aegis-session-message aegis-session-message--${message.role}${
        message.highlighted ? ' aegis-session-message--highlighted' : ''
      }`}
    >
      <summary className="aegis-session-message__head">
        <span className="aegis-session-message__fold" aria-hidden="true" />
        <Chip tone={message.role === 'assistant' ? 'ink' : 'ghost'}>
          {message.role}
        </Chip>
        <MonoValue size="sm">
          {message.id ? message.id.slice(0, 12) : 'message'}
        </MonoValue>
        <span className="aegis-session-message__excerpt">
          {contentExcerpt(message)}
        </span>
        <InspectContentButton
          content={content}
          onInspectContent={onInspectContent}
        />
      </summary>
      <div className="aegis-session-message__body">
        {message.content.map((block, index) => (
          <MessageBlock
            key={`${message.id ?? 'message'}-${index.toString()}`}
            block={block}
            title={`${message.role} block ${index + 1}`}
            onInspectContent={onInspectContent}
          />
        ))}
      </div>
    </details>
  );
}

export function SessionRunTrajectoryView({
  summary,
  messages,
  loading = false,
  error,
  onInspectContent,
}: SessionRunTrajectoryViewProps): ReactElement {
  if (loading) {
    return <EmptyState title="Loading trajectory…" />;
  }
  if (error !== undefined) {
    return <ErrorState title="Failed to load trajectory" description={error} />;
  }
  return (
    <div className="aegis-session-trajectory">
      <div className="aegis-session-trajectory__summary">
        <Chip tone="ghost">{summary.lineage}</Chip>
        <TimeDisplay value={summary.startedAt} />
        <MetricLabel>{summary.inputTokens} in</MetricLabel>
        <MetricLabel>{summary.outputTokens} out</MetricLabel>
      </div>
      {messages.length === 0 ? (
        <EmptyState
          title="No messages"
          description="This session has no message records."
        />
      ) : (
        messages.map((message, index) => (
          <MessageCard
            key={message.id ?? `${message.role}-${index.toString()}`}
            message={message}
            onInspectContent={onInspectContent}
          />
        ))
      )}
    </div>
  );
}

export function SessionRunOutputView({
  facts,
  acceptedSubmission,
  tools,
  loading = false,
  error,
  onInspectContent,
}: SessionRunOutputViewProps): ReactElement {
  if (loading) {
    return <EmptyState title="Loading output…" />;
  }
  if (error !== undefined) {
    return <ErrorState title="Failed to load output" description={error} />;
  }

  const erroredTools = tools.filter((tool) => tool.errored === true);
  const querySqlCount = tools.filter(
    (tool) => tool.tool === 'query_sql',
  ).length;
  const submitErrors = tools.filter(
    (tool) => tool.tool.startsWith('submit_') && tool.errored === true,
  ).length;
  const acceptedSubmissionContent =
    acceptedSubmission == null
      ? null
      : {
          title: `${acceptedSubmission.tool} payload`,
          value: {
            tool: acceptedSubmission.tool,
            args: acceptedSubmission.payload,
            result: acceptedSubmission.result,
          },
          kind: 'json' as const,
        };

  return (
    <div className="aegis-session-output">
      <section className="aegis-session-output__section">
        <h3>Session</h3>
        <dl className="aegis-session-output__facts">
          {facts.map((fact) => (
            <div key={fact.key} className="aegis-session-output__fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="aegis-session-output__section">
        <h3>Output</h3>
        {acceptedSubmission != null && (
          <Chip tone="ghost">{acceptedSubmission.tool}</Chip>
        )}
        {acceptedSubmission?.summary ? (
          <div className="aegis-session-output__roots">
            {acceptedSubmission.summary}
          </div>
        ) : (
          <MetricLabel>No accepted submit payload</MetricLabel>
        )}
        {submitErrors > 0 && (
          <Chip tone="warning">{submitErrors.toString()} failed submit</Chip>
        )}
        {acceptedSubmissionContent != null && (
          <details className="aegis-session-output__json">
            <summary>
              <span>raw payload</span>
              <InspectContentButton
                content={acceptedSubmissionContent}
                onInspectContent={onInspectContent}
              />
            </summary>
            <InspectableRunContent
              content={acceptedSubmissionContent}
              onInspectContent={onInspectContent}
              showHeader={false}
            />
          </details>
        )}
      </section>
      <section className="aegis-session-output__section">
        <h3>Tools</h3>
        <div className="aegis-session-output__chips">
          <Chip tone="ghost">{tools.length.toString()} calls</Chip>
          <Chip tone="ghost">{querySqlCount.toString()} SQL</Chip>
          {erroredTools.length > 0 && (
            <Chip tone="warning">{erroredTools.length.toString()} errors</Chip>
          )}
        </div>
        <div className="aegis-session-output__tool-list">
          {tools.map((tool) => {
            const content = {
              title: `${tool.tool} call`,
              value: { args: tool.args, result: tool.result },
              kind: 'json' as const,
            };
            return (
              <details
                key={tool.id}
                className={`aegis-session-output__tool${
                  tool.errored === true
                    ? ' aegis-session-output__tool--error'
                    : ''
                }`}
              >
                <summary>
                  <span>{tool.tool}</span>
                  <MonoValue size="sm">{tool.duration}</MonoValue>
                  <InspectContentButton
                    content={content}
                    onInspectContent={onInspectContent}
                  />
                </summary>
                <InspectableRunContent
                  content={content}
                  onInspectContent={onInspectContent}
                  showHeader={false}
                />
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
