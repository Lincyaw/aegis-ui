/**
 * Minimal mdast node shape used by the notes remark plugins. We avoid pulling
 * in `@types/mdast`/`unist-util-visit` and walk the tree with these local types.
 */
export interface MdastData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
  data?: MdastData;
}

/**
 * Replace `text` nodes in place. `transform` returns the replacement nodes for
 * a text value, or `null` to leave it untouched. Non-text nodes are recursed
 * into so nested content (list items, table cells, …) is also processed.
 */
export function transformTextNodes(
  node: MdastNode,
  transform: (value: string) => MdastNode[] | null,
): void {
  if (!node.children) {
    return;
  }
  const next: MdastNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const replaced = transform(child.value);
      if (replaced) {
        next.push(...replaced);
      } else {
        next.push(child);
      }
    } else {
      transformTextNodes(child, transform);
      next.push(child);
    }
  }
  node.children = next;
}

/** Recurse the tree invoking `visitor` on every node. */
export function visit(node: MdastNode, visitor: (node: MdastNode) => void): void {
  visitor(node);
  if (node.children) {
    for (const child of node.children) {
      visit(child, visitor);
    }
  }
}
