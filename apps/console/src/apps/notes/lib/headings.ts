export interface TocHeading {
  id: string;
  text: string;
  level: number;
  /** 1-based source line; matches the markdown AST's `position.start.line`. */
  line: number;
}

const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const FENCE_RE = /^\s{0,3}(```|~~~)/;

function stripInlineMarkdown(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * ATX h1–h4 headings outside fenced code, with document-unique ids
 * (`slug`, `slug-1`, …). The TOC lists these and WikiMarkdown assigns the
 * same ids to the rendered headings by source line, so both sides always
 * agree.
 */
export function extractHeadings(md: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const used = new Set<string>();
  let inFence = false;
  md.split('\n').forEach((lineText, idx) => {
    if (FENCE_RE.test(lineText)) {
      inFence = !inFence;
      return;
    }
    const match = inFence ? null : HEADING_RE.exec(lineText);
    if (!match) {
      return;
    }
    const text = stripInlineMarkdown(match[2].trim());
    const base = slugify(text) || 'section';
    let id = base;
    for (let n = 1; used.has(id); n += 1) {
      id = `${base}-${n.toString()}`;
    }
    used.add(id);
    headings.push({ id, text, level: match[1].length, line: idx + 1 });
  });
  return headings;
}
