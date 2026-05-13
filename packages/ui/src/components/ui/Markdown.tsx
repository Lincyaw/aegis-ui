import { Suspense, lazy } from 'react';

import './Markdown.css';

const ReactMarkdown = lazy(() =>
  import('react-markdown').then((m) => ({ default: m.default })),
);

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  const cls = ['aegis-markdown', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <Suspense
        fallback={<pre className="aegis-markdown__fallback">{children}</pre>}
      >
        <ReactMarkdown>{children}</ReactMarkdown>
      </Suspense>
    </div>
  );
}

export default Markdown;
