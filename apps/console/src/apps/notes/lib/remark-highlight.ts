import { type MdastNode, transformTextNodes } from './mdast';

/**
 * remark plugin that turns `==text==` into a `<mark>` element. We reuse the
 * known `delete` node type and override its rendered tag via `data.hName`,
 * which is a reliable way to emit a custom element through mdast-util-to-hast.
 */
const HIGHLIGHT_RE = /==([^=\n]+)==/g;

function splitHighlights(value: string): MdastNode[] | null {
  HIGHLIGHT_RE.lastIndex = 0;
  if (!HIGHLIGHT_RE.test(value)) {
    return null;
  }
  HIGHLIGHT_RE.lastIndex = 0;
  const nodes: MdastNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = HIGHLIGHT_RE.exec(value);
  while (match !== null) {
    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }
    nodes.push({
      type: 'delete',
      data: { hName: 'mark' },
      children: [{ type: 'text', value: match[1] }],
    });
    cursor = match.index + match[0].length;
    match = HIGHLIGHT_RE.exec(value);
  }
  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) });
  }
  return nodes;
}

export function remarkHighlight(): (tree: MdastNode) => void {
  return (tree) => {
    transformTextNodes(tree, splitHighlights);
  };
}
