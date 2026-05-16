/**
 * Normalize a MainTurn into a NormalizedTurn the chat renderer can
 * consume directly. The aggregator already converges langgraph state
 * and AgentM record streams to a shared "AgentM-native" content shape
 * (text / tool_call / tool_result with nested content), but we accept
 * a few sibling shapes defensively so future capture sources that
 * skip the aggregator (or older captures still cached client-side)
 * still render as bubbles instead of a JSON wall.
 *
 * Shapes folded in:
 *   - AgentM-native        tool_call    + tool_result.tool_call_id    (array content)
 *   - Anthropic SDK        tool_use     + tool_result.tool_use_id     (string OR array content)
 *   - LangGraph state msg  content as a plain string
 */

import type { MainTurn } from './schemas';

export type NormalizedRole = 'user' | 'assistant' | 'tool' | 'system';

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

export interface NormalizedTurn {
  index: number;
  role: NormalizedRole;
  blocks: NormalizedBlock[];
  raw: MainTurn;
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

/**
 * tool_result.content may itself be a string, a list of text blocks, or
 * (Anthropic) a mixed list. Flatten to a single string so the user reads
 * tool output as prose instead of a nested JSON tree. The original is
 * still preserved on the NormalizedBlock.raw for a raw-view escape hatch.
 */
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
    const text =
      typeof b.thinking === 'string' ? b.thinking : jsonStringify(b);
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
    role === 'tool'
  ) {
    return role;
  }
  return 'user';
}

export function normalizeTurn(turn: MainTurn): NormalizedTurn {
  const content = (turn as { content?: unknown }).content;
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
  return {
    index: turn.index,
    role: normalizeRole(turn.role),
    blocks,
    raw: turn,
  };
}

/**
 * Convenience for callers that only have a content array — wraps as a
 * synthetic turn so we still go through the normalizer (one entrypoint).
 */
export function normalizeContent(content: unknown): NormalizedBlock[] {
  return normalizeTurn({
    index: 0,
    role: 'user',
    content,
  } as unknown as MainTurn).blocks;
}
