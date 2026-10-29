import type { TableOfContentsItem } from './TableOfContents';

/** One heading of a document's `tableOfContents` export, with the headings under it. */
export interface MdxTocEntry {
  value: string;
  depth: number;
  id?: string;
  children?: MdxTocEntry[];
}

/**
 * The table of contents of a document's `tableOfContents` export: its second
 * and third level headings, in document order.
 */
export function mdxTableOfContents(toc: MdxTocEntry[]): TableOfContentsItem[] {
  return toc.flatMap((entry) => {
    const item: TableOfContentsItem[] =
      entry.id !== undefined && (entry.depth === 2 || entry.depth === 3)
        ? [
            {
              id: entry.id,
              label: entry.value,
              level: entry.depth === 2 ? 1 : 2,
            },
          ]
        : [];
    return [...item, ...mdxTableOfContents(entry.children ?? [])];
  });
}
