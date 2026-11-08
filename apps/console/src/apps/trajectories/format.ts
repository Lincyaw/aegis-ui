// Agent prompts wrap their contract in <agent_contract>; render it as Markdown.
export const SESSION_MARKDOWN_PATTERNS = [/<agent_contract>/];

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
