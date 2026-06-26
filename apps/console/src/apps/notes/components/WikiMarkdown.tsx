import 'katex/dist/katex.min.css';

import { type ComponentProps, type ReactNode, useMemo } from 'react';
import ReactMarkdown, {
  type Components,
  defaultUrlTransform,
} from 'react-markdown';
import { Link } from 'react-router-dom';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { remarkCallout } from '../lib/remark-callout';
import { remarkHighlight } from '../lib/remark-highlight';
import { remarkWikilink, WIKILINK_SCHEME } from '../lib/remark-wikilink';
import { Mermaid } from './Mermaid';

type MarkdownProps = ComponentProps<typeof ReactMarkdown>;
type RemarkPlugins = NonNullable<MarkdownProps['remarkPlugins']>;
type RehypePlugins = NonNullable<MarkdownProps['rehypePlugins']>;

const remarkPlugins = [
  remarkGfm,
  remarkMath,
  remarkWikilink,
  remarkHighlight,
  remarkCallout,
] as unknown as RemarkPlugins;

const rehypePlugins = [rehypeKatex] as unknown as RehypePlugins;

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
  const components = useMemo<Components>(
    () => ({
      a({ href, children }) {
        if (href && href.startsWith(WIKILINK_SCHEME)) {
          const slug = decodeURIComponent(href.slice(WIKILINK_SCHEME.length));
          const target = resolveSlug(slug);
          if (target) {
            return (
              <Link className="wikilink" to={target}>
                {children}
              </Link>
            );
          }
          return (
            <span
              className="wikilink wikilink--broken"
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
      pre({ children }): ReactNode {
        return children;
      },
      code({ className, children }) {
        const text = String(children ?? '').replace(/\n$/, '');
        const lang = /language-([\w-]+)/.exec(className ?? '')?.[1];
        if (lang === 'mermaid') {
          return <Mermaid code={text} />;
        }
        const isBlock = Boolean(className?.includes('language-')) || text.includes('\n');
        if (isBlock) {
          return (
            <pre className="wiki-code">
              <code className={className}>{children}</code>
            </pre>
          );
        }
        return <code className="wiki-code-inline">{children}</code>;
      },
      blockquote({ className, children }) {
        const cls = ['wiki-blockquote', className].filter(Boolean).join(' ');
        return <blockquote className={cls}>{children}</blockquote>;
      },
    }),
    [resolveSlug],
  );

  return (
    <div className="wiki-markdown">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        urlTransform={urlTransform}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
