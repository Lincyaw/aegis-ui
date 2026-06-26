import { type MdastNode, visit } from './mdast';

/**
 * remark plugin for Obsidian-style callouts: a blockquote whose first line is
 * `[!type] Optional title`. The marker line is stripped, a styled title node is
 * prepended, and the blockquote is tagged with `callout callout-<type>` classes
 * for the renderer/CSS to pick up.
 */
const CALLOUT_RE = /^\[!([\w-]+)\][-+]?[ \t]*([^\n]*)(?:\n([\s\S]*))?$/;

function titleFor(type: string, explicit: string): string {
  if (explicit !== '') {
    return explicit;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function applyCallout(blockquote: MdastNode): void {
  const firstChild = blockquote.children?.[0];
  if (!firstChild || firstChild.type !== 'paragraph' || !firstChild.children) {
    return;
  }
  const firstText = firstChild.children[0];
  if (!firstText || firstText.type !== 'text' || typeof firstText.value !== 'string') {
    return;
  }
  const match = CALLOUT_RE.exec(firstText.value);
  if (!match) {
    return;
  }
  const type = match[1].toLowerCase();
  const body = match[3] ?? '';
  firstText.value = body;

  let rest = blockquote.children ?? [];
  if (body === '' && firstChild.children.length === 1) {
    // The marker line was the whole first paragraph — drop the now-empty node.
    rest = rest.slice(1);
  }

  const titleNode: MdastNode = {
    type: 'paragraph',
    data: { hProperties: { className: ['callout-title'] } },
    children: [{ type: 'text', value: titleFor(type, match[2].trim()) }],
  };

  blockquote.children = [titleNode, ...rest];
  blockquote.data = {
    ...blockquote.data,
    hProperties: {
      ...blockquote.data?.hProperties,
      className: ['callout', `callout-${type}`],
    },
  };
}

export function remarkCallout(): (tree: MdastNode) => void {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'blockquote') {
        applyCallout(node);
      }
    });
  };
}
