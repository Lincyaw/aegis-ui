/**
 * AgentM message content, normalised for display by every sub-app that
 * shows agent turns. AgentM-native blocks (`tool_call` / `tool_result` with
 * `tool_call_id` and nested content) are the canonical shape; a few sibling
 * shapes are folded in so captures from other sources still render as
 * messages instead of raw JSON:
 *   - Anthropic SDK: `tool_use` + `tool_result.tool_use_id`, string or array content
 *   - LangGraph state messages: content as a plain string
 */

export type AgentRole = 'user' | 'assistant' | 'tool' | 'system';

export type AgentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'tool_call'; id: string; name: string; args: unknown }
  | {
      kind: 'tool_result';
      toolCallId: string;
      ok: boolean;
      text: string;
      raw: unknown;
    }
  | { kind: 'unknown'; raw: unknown };

export function jsonStringify(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Tool output may be a string, a list of text blocks or (Anthropic) a mixed
 * list. It is flattened to one string so it reads as prose; the original
 * stays on the block's `raw`.
 */
function flattenToolResultContent(content: unknown): string {
  if (content == null) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return jsonStringify(content);
  }
  const parts: string[] = [];
  for (const item of content as unknown[]) {
    if (item != null && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      if (obj.type === 'text' && typeof obj.text === 'string') {
        parts.push(obj.text);
        continue;
      }
      if (typeof obj.content === 'string') {
        parts.push(obj.content);
        continue;
      }
      if (Array.isArray(obj.content)) {
        parts.push(flattenToolResultContent(obj.content));
        continue;
      }
    }
    parts.push(jsonStringify(item));
  }
  return parts.join('\n');
}

export function normalizeBlock(block: unknown): AgentBlock {
  if (block == null || typeof block !== 'object') {
    return { kind: 'unknown', raw: block };
  }
  const b = block as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name : '?';
  const id = typeof b.id === 'string' ? b.id : '';
  switch (b.type) {
    case 'text':
      return typeof b.text === 'string'
        ? { kind: 'text', text: b.text }
        : { kind: 'unknown', raw: block };
    case 'thinking':
      return {
        kind: 'thinking',
        text: typeof b.thinking === 'string' ? b.thinking : jsonStringify(b),
      };
    case 'tool_call':
      return { kind: 'tool_call', id, name, args: b.arguments ?? null };
    case 'tool_use':
      return { kind: 'tool_call', id, name, args: b.input ?? null };
    case 'tool_result':
      return {
        kind: 'tool_result',
        toolCallId:
          typeof b.tool_call_id === 'string'
            ? b.tool_call_id
            : typeof b.tool_use_id === 'string'
              ? b.tool_use_id
              : '',
        ok: b.is_error !== true,
        text: flattenToolResultContent(b.content),
        raw: block,
      };
    default:
      return { kind: 'unknown', raw: block };
  }
}

/** A message's content: an array of blocks, a plain string, or nothing. */
export function normalizeContent(content: unknown): AgentBlock[] {
  if (typeof content === 'string') {
    return [{ kind: 'text', text: content }];
  }
  if (Array.isArray(content)) {
    return (content as unknown[]).map(normalizeBlock);
  }
  if (content == null) {
    return [];
  }
  return [{ kind: 'unknown', raw: content }];
}

export function normalizeRole(role: unknown): AgentRole {
  return role === 'user' ||
    role === 'assistant' ||
    role === 'system' ||
    role === 'tool'
    ? role
    : 'user';
}
