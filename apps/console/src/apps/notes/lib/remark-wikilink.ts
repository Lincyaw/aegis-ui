import { type MdastNode, transformTextNodes } from './mdast';

/**
 * remark plugin that rewrites `[[target]]` and `[[target|display]]` into link
 * nodes. The slug is carried in the URL under a `wikilink:` scheme so the React
 * renderer can resolve it against the slug index at render time. Code spans and
 * fenced code are untouched because only `text` nodes are visited.
 */
export const WIKILINK_SCHEME = 'wikilink:';

const WIKILINK_RE = /\[\[([^\][|\n]+)(?:\|([^\][\n]+))?\]\]/g;

function splitWikilinks(value: string): MdastNode[] | null {
  WIKILINK_RE.lastIndex = 0;
  if (!WIKILINK_RE.test(value)) {
    return null;
  }
  WIKILINK_RE.lastIndex = 0;
  const nodes: MdastNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = WIKILINK_RE.exec(value);
  while (match !== null) {
    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }
    const target = match[1].trim();
    const display = (match[2] ?? match[1]).trim();
    nodes.push({
      type: 'link',
      url: `${WIKILINK_SCHEME}${encodeURIComponent(target)}`,
      children: [{ type: 'text', value: display }],
    });
    cursor = match.index + match[0].length;
    match = WIKILINK_RE.exec(value);
  }
  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) });
  }
  return nodes;
}

export function remarkWikilink(): (tree: MdastNode) => void {
  return (tree) => {
    transformTextNodes(tree, splitWikilinks);
  };
}
