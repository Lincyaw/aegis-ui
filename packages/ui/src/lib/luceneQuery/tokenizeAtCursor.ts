// Cursor-position tokenizer for the QueryAutocomplete LuceneQL input.
// Idiom borrowed from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/hooks/useAutoCompleteOptions.tsx
//
// This is intentionally a small character-level scanner that walks backward
// from the caret to find the boundary of the active token. It deliberately
// does NOT run the full Lucene parser — partial / unparseable input must
// still produce a suggestion.
export type CursorToken =
  | { kind: 'field-start'; prefix: string }
  | { kind: 'value-start'; field: string; prefix: string }
  | { kind: 'operator'; prefix: string }
  | { kind: 'empty' };

const IDENT_RE = /[A-Za-z0-9_.]/;
const OPERATOR_KEYWORDS = ['AND', 'OR', 'NOT'];

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n';
}

/** Walk backward from `caret` to the first whitespace-or-paren boundary that
 *  is not inside a double-quoted region. Returns the start index of the token
 *  the caret sits inside (which may equal `caret` if the caret is at a
 *  boundary). */
function tokenStart(input: string, caret: number): number {
  // First pass: scan forward from start of string, tracking quote state, to
  // figure out whether `caret` is currently inside a quoted region.
  let inQuotes = false;
  let escaped = false;
  let lastBoundary = 0;
  for (let i = 0; i < caret; i++) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inQuotes) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      if (!inQuotes) {
        // closing quote → boundary after it
        lastBoundary = i + 1;
      } else {
        lastBoundary = i;
      }
      continue;
    }
    if (!inQuotes && (isWhitespace(ch) || ch === '(' || ch === ')')) {
      lastBoundary = i + 1;
    }
  }
  return lastBoundary;
}

export function tokenizeAtCursor(input: string, caret: number): CursorToken {
  const clamped = Math.max(0, Math.min(caret, input.length));
  if (input.length === 0) {
    return { kind: 'empty' };
  }
  const start = tokenStart(input, clamped);
  const slice = input.slice(start, clamped);

  // Pure whitespace → empty position.
  if (slice.length === 0) {
    return { kind: 'empty' };
  }

  // Quoted value: `field:"…` — caret inside the quoted region.
  const quoteIdx = slice.indexOf('"');
  if (quoteIdx >= 0) {
    const before = slice.slice(0, quoteIdx);
    const colonIdx = before.indexOf(':');
    if (colonIdx >= 0) {
      const field = before.slice(0, colonIdx);
      const prefix = slice.slice(quoteIdx + 1);
      return { kind: 'value-start', field, prefix };
    }
    return { kind: 'empty' };
  }

  // `field:value` — split on the first colon.
  const colonIdx = slice.indexOf(':');
  if (colonIdx >= 0) {
    const field = slice.slice(0, colonIdx);
    const prefix = slice.slice(colonIdx + 1);
    return { kind: 'value-start', field, prefix };
  }

  // No colon: this is either a field-name partial or an operator partial.
  // Treat any all-uppercase prefix that matches one of AND / OR / NOT as an
  // operator suggestion — otherwise rank it as a field name.
  const upper = slice.toUpperCase();
  if (
    slice.length > 0 &&
    slice === upper &&
    OPERATOR_KEYWORDS.some((kw) => kw.startsWith(upper))
  ) {
    return { kind: 'operator', prefix: slice };
  }

  // Reject obvious non-identifiers (e.g. punctuation only).
  if (!IDENT_RE.test(slice[0])) {
    return { kind: 'empty' };
  }

  return { kind: 'field-start', prefix: slice };
}

/** Replace the token under the caret with `replacement`. Returns the new
 *  input and the caret position after the replacement (right after the
 *  inserted text). Used by QueryAutocomplete to commit a suggestion. */
export function replaceTokenAtCursor(
  input: string,
  caret: number,
  replacement: string,
): { value: string; caret: number } {
  const clamped = Math.max(0, Math.min(caret, input.length));
  const start = tokenStart(input, clamped);
  const next = input.slice(0, start) + replacement + input.slice(clamped);
  return { value: next, caret: start + replacement.length };
}
