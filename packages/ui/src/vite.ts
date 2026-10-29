import mdx from '@mdx-js/rollup';
import rehypeExtractToc from '@stefanprobst/rehype-extract-toc';
import rehypeExportToc from '@stefanprobst/rehype-extract-toc/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import type { Plugin } from 'vite';

/**
 * Compiles `.mdx` documents for `MdxDocument`: GitHub-flavoured Markdown, an
 * id on every heading, and the headings exported as `tableOfContents`. List it
 * before `@vitejs/plugin-react`, whose `include` must take `.mdx` too.
 */
export function aegisMdx(): Plugin {
  return {
    enforce: 'pre',
    ...mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeExtractToc, rehypeExportToc],
    }),
  };
}
