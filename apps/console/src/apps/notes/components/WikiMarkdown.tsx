import { useMemo } from 'react';
import {
  type Components,
  defaultUrlTransform,
  type ExtraProps,
} from 'react-markdown';
import { Link } from 'react-router-dom';

import { Markdown, type MarkdownProps } from '@lincyaw/aegis-ui';
import 'katex/dist/katex.min.css';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { extractHeadings } from '../lib/headings';
import { remarkCallout } from '../lib/remark-callout';
import { remarkHighlight } from '../lib/remark-highlight';
import { remarkMermaid } from '../lib/remark-mermaid';
import { remarkWikilink, WIKILINK_SCHEME } from '../lib/remark-wikilink';

import { Mermaid } from './Mermaid';

const remarkPlugins: MarkdownProps['remarkPlugins'] = [
  remarkMath,
  remarkWikilink,
  remarkHighlight,
  remarkCallout,
  remarkMermaid,
];

const rehypePlugins: MarkdownProps['rehypePlugins'] = [rehypeKatex];

function urlTransform(url: string): string {
  return url.startsWith(WIKILINK_SCHEME) ? url : defaultUrlTransform(url);
}

interface WikiMarkdownProps {
  content: string;
  /** Resolve a wikilink slug to a router URL, or `null` when unresolved. */
  resolveSlug: (slug: string) => string | null;
}

export function WikiMarkdown({
  content,
  resolveSlug,
}: WikiMarkdownProps): JSX.Element {
  const headingIds = useMemo(
    () => new Map(extractHeadings(content).map((h) => [h.line, h.id])),
    [content]
  );

  const components = useMemo<Components>(() => {
    const idFor = (node: ExtraProps['node']): string | undefined =>
      node?.position ? headingIds.get(node.position.start.line) : undefined;
    return {
      h1: ({ node, ...props }) => <h1 {...props} id={idFor(node)} />,
      h2: ({ node, ...props }) => <h2 {...props} id={idFor(node)} />,
      h3: ({ node, ...props }) => <h3 {...props} id={idFor(node)} />,
      h4: ({ node, ...props }) => <h4 {...props} id={idFor(node)} />,
      a({ href, children }) {
        if (href && href.startsWith(WIKILINK_SCHEME)) {
          const slug = decodeURIComponent(href.slice(WIKILINK_SCHEME.length));
          const target = resolveSlug(slug);
          if (target) {
            return (
              <Link className='wikilink' to={target}>
                {children}
              </Link>
            );
          }
          return (
            <span
              className='wikilink wikilink--broken'
              title={`Unresolved note: ${slug}`}
            >
              {children}
            </span>
          );
        }
        const external = href ? /^https?:\/\//.test(href) : false;
        return (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
          >
            {children}
          </a>
        );
      },
      figure: ({ children }) => <Mermaid code={String(children)} />,
    };
  }, [headingIds, resolveSlug]);

  return (
    <Markdown
      variant='document'
      className='wiki-markdown'
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      urlTransform={urlTransform}
      components={components}
    >
      {content}
    </Markdown>
  );
}
