/**
 * Types of the `.mdx` modules that `aegisMdx()` from `@lincyaw/aegis-ui/vite`
 * compiles. A host references them with
 * `/// <reference types="@lincyaw/aegis-ui/mdx-modules" />`.
 */
declare module '*.mdx' {
  import type { MDXContent } from 'mdx/types';

  /** A heading, with the headings under it; `MdxTocEntry` in the library. */
  interface TocEntry {
    value: string;
    depth: number;
    id?: string;
    children?: TocEntry[];
  }

  /** The document's headings, for `mdxTableOfContents`. */
  export const tableOfContents: TocEntry[];

  const Content: MDXContent;
  export default Content;
}
