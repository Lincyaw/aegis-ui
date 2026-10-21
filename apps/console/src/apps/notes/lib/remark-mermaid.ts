import { type MdastNode, visit } from './mdast';

/**
 * remark plugin that takes ```mermaid fences out of the code-block pipeline:
 * the node becomes a `<figure>` holding the diagram source, which WikiMarkdown
 * renders as a diagram, while every other fence keeps the library's code-block
 * rendering. An unknown node type with `value` and `data.hName` converts to
 * that element wrapping the value as text.
 */
export function remarkMermaid(): (tree: MdastNode) => void {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'code' && node.lang === 'mermaid') {
        node.type = 'mermaid';
        node.data = { hName: 'figure' };
      }
    });
  };
}
