import { useCallback, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './CodeBlock.css';

export type CodeBlockSurface = PrimitiveSurface<{
  code: string;
  language: string;
}>;

interface CodeBlockProps {
  code: string;
  language?: 'json' | 'yaml' | 'sql' | 'bash' | 'text';
  showLineNumbers?: boolean;
  className?: string;
  surface?: CodeBlockSurface;
}

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  className,
  surface,
}: CodeBlockProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { code, language },
    'code',
    wrapRef,
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  const lines = code.split('\n');
  const padLen = String(lines.length).length;

  const cls = ['aegis-code-block', className ?? ''].filter(Boolean).join(' ');

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <div className="aegis-code-block__header">
        <span className="aegis-code-block__lang">{language}</span>
        <button
          type="button"
          className="aegis-code-block__copy"
          onClick={handleCopy}
          aria-label="Copy to clipboard"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="aegis-code-block__pre">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="aegis-code-block__line">
              {showLineNumbers && (
                <span className="aegis-code-block__ln">
                  {String(i + 1).padStart(padLen, ' ')}
                </span>
              )}
              <span className="aegis-code-block__body">{line || ' '}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
