import {
  type ComponentProps,
  type ReactNode,
  isValidElement,
  useMemo,
} from 'react';

import type { MDXComponents, MDXContent } from 'mdx/types';

import { CodeBlock } from './CodeBlock';
import { fenceLanguage } from './codeFence';
import { DefaultLink, type LinkComponent } from './linkComponent';
import {
  DOCUMENT_CLASS,
  DOCUMENT_CODE_BLOCK_CLASS,
  DOCUMENT_TAGS,
  documentElement,
} from './markdownDocument';

export interface MdxDocumentProps {
  /** The default export of an `.mdx` module compiled by `aegisMdx()` from `@lincyaw/aegis-ui/vite`. */
  content: MDXContent;
  /**
   * Components the document's JSX names, and overrides of its Markdown
   * elements. An override of a Markdown element receives the element's
   * document class in `className`.
   */
  components?: MDXComponents;
  /** Renders links within the site (`/…`) through the host router; other links are plain anchors. */
  linkComponent?: LinkComponent;
  className?: string;
}

/** A fenced code block, which MDX compiles to a `pre` around one `code`. */
function FencedCode({ children, ...rest }: ComponentProps<'pre'>) {
  if (
    !isValidElement<{ className?: string; children?: ReactNode }>(children) ||
    typeof children.props.children !== 'string'
  ) {
    return <pre {...rest}>{children}</pre>;
  }
  return (
    <CodeBlock
      className={DOCUMENT_CODE_BLOCK_CLASS}
      code={children.props.children.replace(/\n$/, '')}
      language={fenceLanguage(children.props.className)}
    />
  );
}

/** A document link: through the router within the site, a plain anchor elsewhere. */
function documentLink(Link: LinkComponent) {
  return function DocumentLink({
    href = '',
    className,
    children,
  }: ComponentProps<'a'>) {
    return href.startsWith('/') ? (
      <Link to={href} className={className}>
        {children}
      </Link>
    ) : (
      <a href={href} className={className} rel="noreferrer">
        {children}
      </a>
    );
  };
}

/**
 * A long-form document written in MDX, such as an article or a report, in the
 * article type roles: Markdown headings, prose, lists, tables, quotes and code,
 * with the document's own components in between. `Markdown variant="document"`
 * renders runtime Markdown in the same style.
 */
export function MdxDocument({
  content: Content,
  components,
  linkComponent,
  className,
}: MdxDocumentProps) {
  const mapped = useMemo<MDXComponents>(() => {
    const out: MDXComponents = { pre: FencedCode, ...components };
    for (const tag of DOCUMENT_TAGS) {
      const host =
        components?.[tag] ??
        (tag === 'a' ? documentLink(linkComponent ?? DefaultLink) : undefined);
      (out as Record<string, unknown>)[tag] = documentElement(tag, host);
    }
    return out;
  }, [components, linkComponent]);
  return (
    <div
      className={[DOCUMENT_CLASS, className ?? ''].filter(Boolean).join(' ')}
    >
      <Content components={mapped} />
    </div>
  );
}
