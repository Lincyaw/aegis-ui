import type { SpanRow } from './api/clickhouse';

export interface TurnSlice {
  turnIndex: number;
  llm?: SpanRow;
  tools: SpanRow[];
  turnSpan: SpanRow;
}

/**
 * Group spans by `agentm.turn_index` so the conversation view can render
 * one card per turn (LLM request → tool calls). Spans without a turn
 * attribute (session-level events) are returned separately.
 */
export function groupByTurn(spans: SpanRow[]): {
  turns: TurnSlice[];
  sessionSpan?: SpanRow;
} {
  const sessionSpan = spans.find((s) => s.name === 'agentm.session');
  const turnSpans = spans.filter((s) => s.name === 'agentm.turn');
  const turns = turnSpans
    .map<TurnSlice>((turnSpan) => {
      const turnIndex = Number(
        turnSpan.attributes['agentm.turn_index'] ?? '0',
      );
      const children = spans.filter((s) => s.parentSpanId === turnSpan.spanId);
      return {
        turnIndex,
        turnSpan,
        llm: children.find((s) => s.name === 'agentm.llm.request'),
        tools: children.filter((s) => s.name === 'agentm.tool.execute'),
      };
    })
    .sort((a, b) => a.turnIndex - b.turnIndex);
  return { turns, sessionSpan };
}

export function formatTokens(n: number): string {
  if (n < 1000) {
    return n.toString();
  }
  if (n < 1_000_000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60_000).toFixed(1)}m`;
}
