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

export interface InspectableContentOptions {
  /**
   * Extra patterns that mark plain text as Markdown, e.g. a host's own
   * XML-style tags such as `/<agent_contract>/`.
   */
  markdownPatterns?: RegExp[];
}

/** A rich-text string found inside JSON, with every path it appears at. */
export interface ContentSection {
  id: string;
  paths: string[];
  value: string;
  kind: InspectableContentKind;
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

/** The CodeBlock language that shows content of `kind`. */
export function codeLanguage(
  kind: InspectableContentKind,
): 'json' | 'sql' | 'text' {
  return kind === 'json' || kind === 'sql' ? kind : 'text';
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

const MARKDOWN_PATTERNS: RegExp[] = [
  /^#{1,6}\s/m,
  /^\s*[-*+]\s+\S/m,
  /^\s*\d+\.\s+\S/m,
  /```/,
  /`[^`\n]+`/,
  /\*\*[^*\n]+\*\*/,
  /\[[^\]\n]+\]\([^)]+\)/,
  /^\s*>\s+\S/m,
  /^\|.+\|\s*$/m,
];

function looksLikeMarkdown(text: string, extra: RegExp[] = []): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return [...MARKDOWN_PATTERNS, ...extra].some((pattern) =>
    pattern.test(trimmed),
  );
}

/**
 * Classifies content as JSON, SQL, Markdown or text, parsing JSON nested
 * in strings and turning escaped newlines into real ones.
 */
export function prepareInspectableContent(
  content: InspectableContent,
  options: InspectableContentOptions = {},
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
  if (looksLikeMarkdown(text, options.markdownPatterns)) {
    return { kind: 'markdown', text, rawText, value: normalized };
  }
  return { kind: 'text', text, rawText, value: normalized };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function pathLabel(path: string[]): string {
  return path.length === 0 ? 'content' : path.join('.');
}

function collectSections(
  value: unknown,
  options: InspectableContentOptions,
  path: string[],
  sections: ContentSection[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectSections(
        entry,
        options,
        [...path, `[${String(index)}]`],
        sections,
      );
    });
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, entry]) => {
      collectSections(entry, options, [...path, key], sections);
    });
    return;
  }
  if (typeof value !== 'string') {
    return;
  }
  const label = pathLabel(path);
  const prepared = prepareInspectableContent({ title: label, value }, options);
  if (prepared.kind === 'json' && prepared.value !== value) {
    const before = sections.length;
    collectSections(prepared.value, options, path, sections);
    if (sections.length === before) {
      sections.push({
        id: label,
        paths: [label],
        value: prepared.text,
        kind: 'json',
      });
    }
    return;
  }
  const isRichText =
    prepared.kind === 'markdown' ||
    prepared.kind === 'sql' ||
    normalizeInspectableText(value).includes('\n');
  if (isRichText) {
    sections.push({
      id: `${label}:${String(sections.length)}`,
      paths: [label],
      value,
      kind: prepared.kind,
    });
  }
}

/**
 * The rich-text strings (Markdown, SQL, multi-line text, JSON nested in a
 * string) inside a JSON value, each once, with every path it appears at.
 */
export function collectContentSections(
  value: unknown,
  options: InspectableContentOptions = {},
): ContentSection[] {
  const sections: ContentSection[] = [];
  collectSections(value, options, [], sections);
  const byContent = new Map<string, ContentSection>();
  sections.forEach((section) => {
    const key = `${section.kind}\u0000${section.value}`;
    const existing = byContent.get(key);
    if (existing === undefined) {
      byContent.set(key, { ...section, paths: [...section.paths] });
      return;
    }
    existing.paths.push(...section.paths);
  });
  return [...byContent.values()].map((section, index) => ({
    ...section,
    id: `${section.paths[0]}:${String(index)}`,
  }));
}
