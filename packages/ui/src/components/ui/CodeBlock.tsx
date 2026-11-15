import { type MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useStrings } from '../../locale';
import type { PopoverAnchor } from './AnchoredPopover';
import './CodeBlock.css';
import { CopyGlyph } from './CopyGlyph';

/** Lines `start` to `end`, 1-based and inclusive. */
export interface CodeLineRange {
  start: number;
  end: number;
}

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
  /**
   * The selected lines, drawn in the brand's soft surface with a brand rule
   * at their left. Leave it out to let the block keep its own selection.
   */
  selectedLines?: CodeLineRange | null;
  /**
   * Makes the line numbers buttons that select lines: a press selects its
   * line, Shift extends the range from the last line pressed, and pressing
   * the only selected line clears it. Receives the range and an anchor over
   * its lines, for an `AnchoredPopover`; turns line numbers on.
   */
  onSelectLines?: (
    range: CodeLineRange | null,
    anchor: PopoverAnchor | null,
  ) => void;
}

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  maxHeight,
  className,
  surface,
  selectedLines,
  onSelectLines,
}: CodeBlockProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const pivot = useRef<number | null>(null);
  const [ownSelection, setOwnSelection] = useState<CodeLineRange | null>(null);
  const selection = selectedLines === undefined ? ownSelection : selectedLines;
  const selectable = onSelectLines !== undefined;
  const numbered = showLineNumbers || selectable;
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

  const anchorFor = useCallback(
    (range: CodeLineRange): PopoverAnchor => ({
      getBoundingClientRect: () => {
        const rows = preRef.current?.querySelectorAll<HTMLElement>(
          '.aegis-code-block__line',
        );
        const first = rows?.[range.start - 1]?.getBoundingClientRect();
        const last = rows?.[range.end - 1]?.getBoundingClientRect();
        if (!first || !last) {
          return new DOMRect();
        }
        return new DOMRect(
          first.left,
          first.top,
          first.width,
          last.bottom - first.top,
        );
      },
      contains: (node) => preRef.current?.contains(node) ?? false,
    }),
    [],
  );

  const handleLinePress = useCallback(
    (line: number, event: MouseEvent<HTMLButtonElement>) => {
      const from = event.shiftKey ? pivot.current : null;
      const only =
        selection?.start === line && selection.end === line && from === null;
      const next: CodeLineRange | null = only
        ? null
        : from === null
          ? { start: line, end: line }
          : { start: Math.min(from, line), end: Math.max(from, line) };
      if (from === null) {
        pivot.current = next ? line : null;
      }
      setOwnSelection(next);
      onSelectLines?.(next, next ? anchorFor(next) : null);
    },
    [selection, onSelectLines, anchorFor],
  );

  const selectedSet = useMemo(
    () =>
      selection
        ? (line: number) => line >= selection.start && line <= selection.end
        : () => false,
    [selection],
  );

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
          <CopyGlyph copied={copied} />
          {copied ? strings.copied : strings.copy}
        </button>
      </div>
      <pre
        ref={preRef}
        className="aegis-code-block__pre"
        style={maxHeight === undefined ? undefined : { maxHeight }}
      >
        <code>
          {lines.map((line, i) => {
            const number = i + 1;
            const selected = selectedSet(number);
            const label = String(number).padStart(padLen, ' ');
            return (
              <div
                key={i}
                className={
                  selected
                    ? 'aegis-code-block__line aegis-code-block__line--selected'
                    : 'aegis-code-block__line'
                }
              >
                {numbered &&
                  (selectable ? (
                    <button
                      type="button"
                      className="aegis-code-block__ln aegis-code-block__ln--button"
                      aria-label={strings.codeLine(number)}
                      aria-pressed={selected}
                      onClick={(event) => {
                        handleLinePress(number, event);
                      }}
                    >
                      {label}
                    </button>
                  ) : (
                    <span className="aegis-code-block__ln">{label}</span>
                  ))}
                <span className="aegis-code-block__body">{line || ' '}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
