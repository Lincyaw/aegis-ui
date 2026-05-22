/**
 * Normalize an entry payload (``entry_type: 'message'``) into a small chat
 * shape the renderer consumes directly. Adapted from
 * ``llmharness-review/messageAdapter.ts`` — kept local per the
 * "don't reach into peer sub-app" rule. AgentM live payloads carry
 * ``role`` + ``content[]`` where each block matches one of:
 *
 *   - { type: 'text', text }
 *   - { type: 'thinking', thinking }
 *   - { type: 'tool_use', id, name, input }      (Anthropic-shape)
 *   - { type: 'tool_call', id, name, arguments } (AgentM-native)
 *   - { type: 'tool_result', tool_call_id|tool_use_id, content, is_error? }
 *
 * Anything we don't recognise lands in a ``unknown`` block so the UI
 * surfaces it as a JSON escape hatch instead of dropping it silently.
 */

export type NormalizedRole = 'user' | 'assistant' | 'tool' | 'tool_result' | 'system';

export type NormalizedBlock =
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

export interface NormalizedMessage {
  role: NormalizedRole;
  blocks: NormalizedBlock[];
}

function jsonStringify(value: unknown): string {
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

function flattenToolResultContent(content: unknown): string {
  if (content == null) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
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
  return jsonStringify(content);
}

function normalizeBlock(block: unknown): NormalizedBlock {
  if (block == null || typeof block !== 'object') {
    return { kind: 'unknown', raw: block };
  }
  const b = block as Record<string, unknown>;
  const t = b.type;

  if (t === 'text' && typeof b.text === 'string') {
    return { kind: 'text', text: b.text };
  }
  if (t === 'thinking') {
    const text = typeof b.thinking === 'string' ? b.thinking : jsonStringify(b);
    return { kind: 'thinking', text };
  }
  if (t === 'tool_call') {
    return {
      kind: 'tool_call',
      id: typeof b.id === 'string' ? b.id : '',
      name: typeof b.name === 'string' ? b.name : '?',
      args: b.arguments ?? null,
    };
  }
  if (t === 'tool_use') {
    return {
      kind: 'tool_call',
      id: typeof b.id === 'string' ? b.id : '',
      name: typeof b.name === 'string' ? b.name : '?',
      args: b.input ?? null,
    };
  }
  if (t === 'tool_result') {
    const toolCallId =
      typeof b.tool_call_id === 'string'
        ? b.tool_call_id
        : typeof b.tool_use_id === 'string'
          ? b.tool_use_id
          : '';
    const ok = b.is_error !== true;
    const text = flattenToolResultContent(b.content);
    return { kind: 'tool_result', toolCallId, ok, text, raw: block };
  }
  return { kind: 'unknown', raw: block };
}

function normalizeRole(role: unknown): NormalizedRole {
  if (
    role === 'user' ||
    role === 'assistant' ||
    role === 'system' ||
    role === 'tool' ||
    role === 'tool_result'
  ) {
    return role;
  }
  return 'user';
}

export function normalizeMessage(payload: Record<string, unknown>): NormalizedMessage {
  const role = normalizeRole(payload.role);
  const content = payload.content;
  let blocks: NormalizedBlock[];
  if (typeof content === 'string') {
    blocks = [{ kind: 'text', text: content }];
  } else if (Array.isArray(content)) {
    blocks = (content as unknown[]).map(normalizeBlock);
  } else if (content == null) {
    blocks = [];
  } else {
    blocks = [{ kind: 'unknown', raw: content }];
  }
  return { role, blocks };
}
