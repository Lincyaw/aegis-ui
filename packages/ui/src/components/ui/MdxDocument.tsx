import {
  type ComponentProps,
  type ReactNode,
  isValidElement,
  useMemo,
} from 'react';

import type { MDXComponents, MDXContent } from 'mdx/types';

import { CodeBlock } from './CodeBlock';
import './MdxDocument.css';
import { fenceLanguage } from './codeFence';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface MdxDocumentProps {
  /** The default export of an `.mdx` module compiled by `aegisMdx()` from `@lincyaw/aegis-ui/vite`. */
  content: MDXContent;
  /** Components the document's JSX names, and overrides of its Markdown elements. */
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
      className="aegis-mdx__code-block"
      code={children.props.children.replace(/\n$/, '')}
      language={fenceLanguage(children.props.className)}
    />
  );
}

/** A document link: through the router within the site, a plain anchor elsewhere. */
function documentLink(Link: LinkComponent) {
  return function DocumentLink({ href = '', children }: ComponentProps<'a'>) {
    return href.startsWith('/') ? (
      <Link to={href} className="aegis-mdx__link">
        {children}
      </Link>
    ) : (
      <a href={href} className="aegis-mdx__link" rel="noreferrer">
        {children}
      </a>
    );
  };
}

/**
 * A long-form document written in MDX, such as an article or a report, in the
 * article type roles: Markdown headings, prose, lists, tables, quotes and code,
 * with the document's own components in between.
 */
export function MdxDocument({
  content: Content,
  components,
  linkComponent,
  className,
}: MdxDocumentProps) {
  const mapped = useMemo<MDXComponents>(
    () => ({
      pre: FencedCode,
      a: documentLink(linkComponent ?? DefaultLink),
      ...components,
    }),
    [components, linkComponent],
  );
  return (
    <div className={['aegis-mdx', className ?? ''].filter(Boolean).join(' ')}>
      <Content components={mapped} />
    </div>
  );
}
