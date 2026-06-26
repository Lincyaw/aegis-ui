/**
 * Tiny YAML frontmatter parser tailored to the note format spec: a leading
 * `---` block with `key: value` pairs where values are either plain scalars or
 * inline arrays (`[a, b, c]`). The YAML list form (`- item`) is intentionally
 * not supported, matching the WikiLink LSP behaviour.
 */
export interface Frontmatter {
  title?: string;
  tags?: string[];
  aliases?: string[];
  [key: string]: string | string[] | undefined;
}

export interface ParsedNote {
  frontmatter: Frontmatter;
  content: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const KEY_VALUE_RE = /^([A-Za-z0-9_-]+):\s*(.*)$/;

export function parseFrontmatter(raw: string): ParsedNote {
  const normalized = raw.replace(/^\uFEFF/, '');
  const match = FRONTMATTER_RE.exec(normalized);
  if (!match) {
    return { frontmatter: {}, content: normalized };
  }
  return {
    frontmatter: parseBlock(match[1]),
    content: normalized.slice(match[0].length),
  };
}

function parseBlock(block: string): Frontmatter {
  const fm: Frontmatter = {};
  for (const line of block.split(/\r?\n/)) {
    const match = KEY_VALUE_RE.exec(line);
    if (!match) {
      continue;
    }
    const key = match[1];
    const value = match[2].trim();
    if (value === '') {
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      fm[key] = parseInlineArray(value);
    } else {
      fm[key] = stripQuotes(value);
    }
  }
  return fm;
}

function parseInlineArray(value: string): string[] {
  const inner = value.slice(1, -1).trim();
  if (inner === '') {
    return [];
  }
  return inner
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter((item) => item !== '');
}

function stripQuotes(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  return quoted ? value.slice(1, -1) : value;
}
