import {
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Chip, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import type { SpanRow } from '../api/clickhouse';
import { formatDurationMs, formatTokens } from '../conversation';
import type { CustomSpanRule } from '../prefs';
import { classifyWithRules, type SpanKind } from '../spanKind';
import './Storyline.css';

interface StorylineProps {
  spans: SpanRow[];
  selectedSpanId: string;
  onSelectSpan: (spanId: string) => void;
  customRules: CustomSpanRule[];
}

interface Event {
  span: SpanRow;
  kind: SpanKind;
  start: number;
}

const KIND_TONE: Record<SpanKind, 'ink' | 'warning' | 'ghost'> = {
  session: 'ink',
  turn: 'ink',
  llm: 'ink',
  tool: 'ink',
  event: 'ghost',
  handler: 'ghost',
  bootstrap: 'ghost',
  diagnostic: 'warning',
  other: 'ghost',
};

function hasBody(span: SpanRow, kind: SpanKind): boolean {
  if (kind === 'tool') {
    return Boolean(
      span.attributes['agentm.tool.args'] ?? span.attributes['agentm.tool.result'],
    );
  }
  if (kind === 'llm' || kind === 'turn') {
    return true;
  }
  return Boolean(span.statusMessage);
}

export function Storyline({
  spans,
  selectedSpanId,
  onSelectSpan,
  customRules,
}: StorylineProps): ReactElement {
  const events = useMemo<Event[]>(() => {
    return spans
      .map((s) => ({
        span: s,
        kind: classifyWithRules(s.name, customRules),
        start: new Date(s.timestamp).getTime(),
      }))
      .sort((a, b) => a.start - b.start);
  }, [spans, customRules]);

  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(
    () => new Set(),
  );

  // Auto-scroll the selected card into view.
  const selectedRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedSpanId]);

  if (events.length === 0) {
    return (
      <div className='aegis-storyline__empty'>
        <MetricLabel size='xs'>nothing matches the current filters</MetricLabel>
      </div>
    );
  }

  const toggleExpanded = (id: string): void => {
    setManuallyExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ol className='aegis-storyline'>
      {events.map((ev) => {
        const isError = ev.span.statusCode === 'STATUS_CODE_ERROR';
        const tone = isError ? 'warning' : KIND_TONE[ev.kind];
        const selected = ev.span.spanId === selectedSpanId;
        const bodyAvailable = hasBody(ev.span, ev.kind);
        // Selected cards auto-expand. Manual toggles override (so users
        // can collapse a selected card if they want).
        const expanded = manuallyExpanded.has(ev.span.spanId) || selected;
        return (
          <li
            key={ev.span.spanId}
            ref={selected ? selectedRef : null}
            className={`aegis-storyline__item aegis-storyline__item--${ev.kind}${
              selected ? ' aegis-storyline__item--selected' : ''
            }${isError ? ' aegis-storyline__item--error' : ''}`}
          >
            <div className='aegis-storyline__head-row'>
              <button
                type='button'
                className='aegis-storyline__head'
                onClick={() => onSelectSpan(ev.span.spanId)}
              >
                <Chip tone={tone}>{ev.kind}</Chip>
                <span className='aegis-storyline__title'>
                  {storylineTitle(ev.span, ev.kind)}
                </span>
                <MonoValue size='sm' className='aegis-storyline__dur'>
                  {formatDurationMs(ev.span.durationNs / 1_000_000)}
                </MonoValue>
              </button>
              {bodyAvailable && (
                <button
                  type='button'
                  className='aegis-storyline__caret'
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                  onClick={() => toggleExpanded(ev.span.spanId)}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              )}
            </div>
            {expanded && <EventBody span={ev.span} kind={ev.kind} />}
          </li>
        );
      })}
    </ol>
  );
}

function storylineTitle(span: SpanRow, kind: SpanKind): string {
  if (kind === 'session') {
    const purpose = span.attributes['agentm.purpose'];
    const sid = span.attributes['agentm.session_id'] ?? '';
    return `session · ${purpose ?? (span.attributes['agentm.parent_session_id'] ? 'child' : 'orchestrator')} · ${sid.slice(0, 12)}`;
  }
  if (kind === 'turn') {
    return `turn ${span.attributes['agentm.turn_index'] ?? '?'}`;
  }
  if (kind === 'llm') {
    return `llm · ${span.attributes['gen_ai.request.model'] ?? 'unknown'}`;
  }
  if (kind === 'tool') {
    return `tool · ${span.attributes['agentm.tool.name'] ?? 'unknown'}`;
  }
  if (kind === 'event' || kind === 'handler') {
    return span.name.split(':', 2)[1] ?? span.name;
  }
  return span.name;
}

function EventBody({
  span,
  kind,
}: {
  span: SpanRow;
  kind: SpanKind;
}): ReactElement | null {
  if (kind === 'tool') {
    const args = span.attributes['agentm.tool.args'];
    const result = span.attributes['agentm.tool.result'];
    if (!args && !result) {
      return null;
    }
    return (
      <div className='aegis-storyline__body'>
        {args && <CodeBlock label='args' code={args} />}
        {result && <CodeBlock label='result' code={result} />}
      </div>
    );
  }
  if (kind === 'llm') {
    const inTok = span.attributes['gen_ai.usage.input_tokens'];
    const outTok = span.attributes['gen_ai.usage.output_tokens'];
    if (!inTok && !outTok) {
      return null;
    }
    return (
      <div className='aegis-storyline__llm-stats'>
        in <MonoValue size='sm'>{formatTokens(Number(inTok ?? 0))}</MonoValue>{' '}
        · out{' '}
        <MonoValue size='sm'>{formatTokens(Number(outTok ?? 0))}</MonoValue>
      </div>
    );
  }
  if (kind === 'turn') {
    const stop = span.attributes['agentm.turn.stop_reason'];
    if (!stop) {
      return null;
    }
    return (
      <div className='aegis-storyline__llm-stats'>
        stop <MonoValue size='sm'>{stop}</MonoValue>
      </div>
    );
  }
  if (span.statusMessage) {
    return (
      <div className='aegis-storyline__body'>
        <CodeBlock label='status' code={span.statusMessage} />
      </div>
    );
  }
  return null;
}

function CodeBlock({
  label,
  code,
}: {
  label: string;
  code: string;
}): ReactElement {
  return (
    <div>
      <MetricLabel size='xs'>{label}</MetricLabel>
      <pre className='aegis-storyline__code'>{code}</pre>
    </div>
  );
}

export default Storyline;
