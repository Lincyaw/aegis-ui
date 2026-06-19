const MAX_NESTED_JSON_PARSE_DEPTH = 4;
const MAX_STRUCTURE_DEPTH = 32;

export type InspectableContentKind = 'json' | 'markdown' | 'sql' | 'text';

export interface InspectableContent {
  title: string;
  value: unknown;
  kind?: InspectableContentKind;
}

export interface PreparedInspectableContent {
  kind: InspectableContentKind;
  text: string;
  rawText: string;
  value: unknown;
}

function stringify(value: unknown): string {
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

type JsonParseResult = { ok: true; value: unknown } | { ok: false };

function parseJsonContainer(text: string): JsonParseResult {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false };
  }
}

function normalizeNestedJson(
  value: unknown,
  parseDepth = 0,
  structureDepth = 0,
  seen: WeakSet<object> = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    if (parseDepth >= MAX_NESTED_JSON_PARSE_DEPTH) {
      return value;
    }
    const parsed = parseJsonContainer(value);
    if (!parsed.ok) {
      return value;
    }
    return normalizeNestedJson(
      parsed.value,
      parseDepth + 1,
      structureDepth,
      seen,
    );
  }
  if (Array.isArray(value)) {
    if (structureDepth >= MAX_STRUCTURE_DEPTH) {
      return value;
    }
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const normalized = value.map((item) =>
      normalizeNestedJson(item, parseDepth, structureDepth + 1, seen),
    );
    seen.delete(value);
    return normalized;
  }
  if (value != null && typeof value === 'object') {
    if (structureDepth >= MAX_STRUCTURE_DEPTH) {
      return value;
    }
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const normalized = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeNestedJson(entry, parseDepth, structureDepth + 1, seen),
      ]),
    );
    seen.delete(value);
    return normalized;
  }
  return value;
}

export function normalizeInspectableText(text: string): string {
  return text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

function isJsonLike(value: unknown): boolean {
  return value != null && typeof value === 'object';
}

function looksLikeSql(text: string): boolean {
  return /^\s*(with|select|insert|update|delete|create|alter|drop|explain)\b/i.test(
    text,
  );
}

function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return [
    /^#{1,6}\s/m,
    /^\s*[-*+]\s+\S/m,
    /^\s*\d+\.\s+\S/m,
    /```/,
    /`[^`\n]+`/,
    /\*\*[^*\n]+\*\*/,
    /\[[^\]\n]+\]\([^)]+\)/,
    /^\s*>\s+\S/m,
    /^\|.+\|\s*$/m,
    /<agent_contract>/,
  ].some((pattern) => pattern.test(trimmed));
}

export function prepareInspectableContent(
  content: InspectableContent,
): PreparedInspectableContent {
  const rawText = stringify(content.value);
  const normalized = normalizeNestedJson(content.value);
  const normalizedText = stringify(normalized);
  if (content.kind === 'json' || isJsonLike(normalized)) {
    return { kind: 'json', text: normalizedText, rawText, value: normalized };
  }
  const text = normalizeInspectableText(normalizedText);
  if (content.kind !== undefined) {
    return { kind: content.kind, text, rawText, value: normalized };
  }
  if (looksLikeSql(text)) {
    return { kind: 'sql', text, rawText, value: normalized };
  }
  if (looksLikeMarkdown(text)) {
    return { kind: 'markdown', text, rawText, value: normalized };
  }
  return { kind: 'text', text, rawText, value: normalized };
}
