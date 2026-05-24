import type { SpanRow } from './api/clickhouse';

import type { CustomSpanRule } from './prefs';

/**
 * Coarse semantic bucket for a span. The Trace / Storyline / Sessions
 * views only care about a handful of categories — span SpanName is
 * pattern-matched into one of these.
 */
export type SpanKind =
  | 'session'
  | 'turn'
  | 'llm'
  | 'tool'
  | 'event'
  | 'handler'
  | 'bootstrap'
  | 'diagnostic'
  | 'other';

export const ALL_SPAN_KINDS: SpanKind[] = [
  'session',
  'turn',
  'llm',
  'tool',
  'event',
  'handler',
  'bootstrap',
  'diagnostic',
  'other',
];

export function classifyWithRules(
  name: string,
  rules: CustomSpanRule[]
): SpanKind {
  for (const r of rules) {
    if (r.pattern && name.includes(r.pattern)) {
      return r.kind;
    }
  }
  return classifySpan(name);
}

export function classifySpan(name: string): SpanKind {
  // AgentM emits OTel GenAI-semconv span names: the discriminator
  // (scenario / model / tool) is appended after a space.
  if (name === 'invoke_agent' || name.startsWith('invoke_agent ')) {
    return 'session';
  }
  if (name === 'agentm.turn') {
    return 'turn';
  }
  if (name === 'chat' || name.startsWith('chat ')) {
    return 'llm';
  }
  if (name === 'execute_tool' || name.startsWith('execute_tool ')) {
    return 'tool';
  }
  if (name.startsWith('agentm.event:')) {
    return 'event';
  }
  if (name.startsWith('agentm.handler:')) {
    return 'handler';
  }
  if (name.startsWith('agentm.diagnostic')) {
    return 'diagnostic';
  }
  return 'other';
}

/**
 * Display label for a span row — strips the redundant prefix and
 * pulls in a discriminator attribute (tool name, turn index) when the
 * raw name on its own is too generic.
 */
export function spanDisplayName(span: SpanRow): string {
  const kind = classifySpan(span.name);
  if (kind === 'tool') {
    return `tool · ${span.attributes['gen_ai.tool.name'] ?? 'unknown'}`;
  }
  if (kind === 'turn') {
    return `turn ${span.attributes['agentm.turn.index'] ?? '?'}`;
  }
  if (kind === 'event' || kind === 'handler') {
    // Strip the prefix; the channel name is what's interesting.
    return span.name.split(':', 2)[1] ?? span.name;
  }
  return span.name;
}
