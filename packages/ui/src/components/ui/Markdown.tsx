import { type ComponentProps, Suspense, lazy } from 'react';

import type { Components, ExtraProps, Options } from 'react-markdown';

import { CodeBlock } from './CodeBlock';
import './Markdown.css';

const ReactMarkdown = lazy(() =>
  import('react-markdown').then((m) => ({ default: m.default })),
);

export interface MarkdownProps extends Pick<
  Options,
  'remarkPlugins' | 'rehypePlugins' | 'components' | 'urlTransform'
> {
  children: string;
  className?: string;
}

type HastNode = NonNullable<ExtraProps['node']>['children'][number];
type CodeBlockLanguage = NonNullable<
  ComponentProps<typeof CodeBlock>['language']
>;

const FENCE_LANGUAGES: Partial<Record<string, CodeBlockLanguage>> = {
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
};

function textOf(node: HastNode): string {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'element') {
    return node.children.map(textOf).join('');
  }
  return '';
}

function fenceLanguage(className: unknown): CodeBlockLanguage {
  const classes = Array.isArray(className) ? className : [];
  for (const c of classes) {
    if (typeof c === 'string' && c.startsWith('language-')) {
      return FENCE_LANGUAGES[c.slice('language-'.length)] ?? 'text';
    }
  }
  return 'text';
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
  return (
    <CodeBlock
      className="aegis-markdown__code-block"
      code={textOf(code).replace(/\n$/, '')}
      language={fenceLanguage(code.properties.className)}
    />
  );
}

const DEFAULT_COMPONENTS: Components = { pre: FencedCode };

export function Markdown({
  children,
  className,
  remarkPlugins,
  rehypePlugins,
  components,
  urlTransform,
}: MarkdownProps) {
  const cls = ['aegis-markdown', className ?? ''].filter(Boolean).join(' ');
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
