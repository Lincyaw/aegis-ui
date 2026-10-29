import { type ComponentProps, Suspense, lazy } from 'react';

import type { Components, ExtraProps, Options } from 'react-markdown';

import { CodeBlock } from './CodeBlock';
import './Markdown.css';
import { fenceLanguage } from './codeFence';

// GitHub-flavoured Markdown (tables, task lists, strikethrough) is on by
// default. Both packages are ESM-only, so they load lazily to keep the CJS
// build requirable.
const ReactMarkdown = lazy(async () => {
  const [{ default: BaseMarkdown }, { default: remarkGfm }] = await Promise.all(
    [import('react-markdown'), import('remark-gfm')],
  );
  function GfmMarkdown({ remarkPlugins, ...rest }: Options) {
    return (
      <BaseMarkdown
        {...rest}
        remarkPlugins={[
          remarkGfm,
          ...(remarkPlugins ?? []).filter((p) => p !== remarkGfm),
        ]}
      />
    );
  }
  return { default: GfmMarkdown };
});

export interface MarkdownProps extends Pick<
  Options,
  'remarkPlugins' | 'rehypePlugins' | 'components' | 'urlTransform'
> {
  children: string;
  className?: string;
  /**
   * `compact` (default) keeps every heading at body size for chat turns,
   * tooltips and cards. `document` uses a heading scale and roomier
   * spacing for long-form pages.
   */
  variant?: 'compact' | 'document';
}

type HastNode = NonNullable<ExtraProps['node']>['children'][number];

function textOf(node: HastNode): string {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'element') {
    return node.children.map(textOf).join('');
  }
  return '';
}

function FencedCode({
  node,
  children,
  ...rest
}: ComponentProps<'pre'> & ExtraProps) {
  const code = node?.children[0];
  if (code?.type !== 'element' || code.tagName !== 'code') {
    return <pre {...rest}>{children}</pre>;
  }
  const classes = code.properties.className;
  return (
    <CodeBlock
      className="aegis-markdown__code-block"
      code={textOf(code).replace(/\n$/, '')}
      language={fenceLanguage(
        Array.isArray(classes) ? classes.join(' ') : undefined,
      )}
    />
  );
}

const DEFAULT_COMPONENTS: Components = { pre: FencedCode };

export function Markdown({
  children,
  className,
  variant = 'compact',
  remarkPlugins,
  rehypePlugins,
  components,
  urlTransform,
}: MarkdownProps) {
  const cls = [
    'aegis-markdown',
    variant === 'document' ? 'aegis-markdown--document' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <Suspense
        fallback={<pre className="aegis-markdown__fallback">{children}</pre>}
      >
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={{ ...DEFAULT_COMPONENTS, ...components }}
          urlTransform={urlTransform}
        >
          {children}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
}
