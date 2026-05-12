import { useCallback, useRef, useState } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './CodeBlock.css';

export interface CodeBlockSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    code: string;
    language: string;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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
  useAegisSurface<{ code: string; language: string }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'code',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { code, language },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
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
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
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

export default CodeBlock;
