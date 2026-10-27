import { useCallback, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStrings } from '../../locale';
import './CodeBlock.css';

export type CodeBlockSurface = PrimitiveSurface<{
  code: string;
  language: string;
}>;

interface CodeBlockProps {
  code: string;
  /** Shown as the header label, e.g. `json`, `typescript`, `python`. */
  language?: string;
  showLineNumbers?: boolean;
  /** Caps the code area's height (number → px); longer code scrolls inside. */
  maxHeight?: number | string;
  className?: string;
  surface?: CodeBlockSurface;
}

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  maxHeight,
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
  const { copied, copy } = useCopyToClipboard(1500);
  const strings = useStrings();

  const handleCopy = useCallback(() => {
    void copy(code);
  }, [copy, code]);

  const lines = code.split('\n');
  const padLen = String(lines.length).length;

  const cls = ['aegis-code-block', className ?? ''].filter(Boolean).join(' ');

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <div className="aegis-code-block__header">
        <span className="aegis-code-block__lang">
          {language === 'text' ? strings.plainTextLanguage : language}
        </span>
        <button
          type="button"
          className="aegis-code-block__copy"
          onClick={handleCopy}
          aria-label={strings.copyToClipboard}
        >
          {copied ? strings.copied : strings.copy}
        </button>
      </div>
      <pre
        className="aegis-code-block__pre"
        style={maxHeight === undefined ? undefined : { maxHeight }}
      >
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
