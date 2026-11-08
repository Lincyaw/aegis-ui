// QueryAutocomplete — LuceneQL search input with attribute / value
// suggestions. Suggestion-merging idiom adapted from HyperDX (MIT,
// DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/SearchInput/AutocompleteInput.tsx
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover, Tooltip } from 'antd';
import Fuse from 'fuse.js';

import {
  replaceTokenAtCursor,
  tokenizeAtCursor,
} from '../../lib/luceneQuery/tokenizeAtCursor';
import { type AegisStrings, useStrings } from '../../locale';
import './QueryAutocomplete.css';

export interface QueryAutocompleteFieldSuggestion {
  value: string;
  hint?: string;
}

export interface QueryAutocompleteValueSuggestion {
  value: string;
  hint?: string;
}

export interface QueryAutocompleteProps {
  value: string;
  onChange: (next: string) => void;
  /** Called when user presses Enter and no popover is open. */
  onSubmit?: (value: string) => void;
  /** Field-name completions; rendered when cursor is in a field-start token. */
  fieldSuggestions: QueryAutocompleteFieldSuggestion[];
  /** Value completions for `field:` tokens. Return [] to opt out. */
  valueSuggestions?: (
    field: string,
    prefix: string,
  ) =>
    | Promise<QueryAutocompleteValueSuggestion[]>
    | QueryAutocompleteValueSuggestion[];
  placeholder?: string;
  /** Show a "?" tooltip with the LuceneQL cheat sheet. Default true. */
  showHelp?: boolean;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
}

interface RankedSuggestion {
  value: string;
  hint?: string;
  insert: string;
  /** The query goes on after it (a field takes a value), so the list stays open. */
  continues?: boolean;
}

const SUGGESTIONS_LIMIT = 10;
const OPERATOR_KEYWORDS: readonly string[] = ['AND', 'OR', 'NOT'];

const HELP_LINES: ReadonlyArray<{
  syntax: string;
  kind: Parameters<AegisStrings['querySyntax']>[0];
}> = [
  { syntax: 'field:value', kind: 'exact' },
  { syntax: 'field:"a b"', kind: 'phrase' },
  { syntax: 'field:foo*', kind: 'wildcard' },
  { syntax: 'field:>10', kind: 'range' },
  { syntax: 'AND OR NOT', kind: 'boolean' },
  { syntax: '(a OR b)', kind: 'grouping' },
];

function rankFieldSuggestions(
  options: readonly QueryAutocompleteFieldSuggestion[],
  prefix: string,
): RankedSuggestion[] {
  if (prefix.length === 0) {
    return options.slice(0, SUGGESTIONS_LIMIT).map((o) => ({
      value: o.value,
      hint: o.hint,
      insert: `${o.value}:`,
      continues: true,
    }));
  }
  const fuse = new Fuse(options, {
    keys: ['value'],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse
    .search(prefix)
    .slice(0, SUGGESTIONS_LIMIT)
    .map((r) => ({
      value: r.item.value,
      hint: r.item.hint,
      insert: `${r.item.value}:`,
      continues: true,
    }));
}

function rankValueSuggestions(
  field: string,
  options: readonly QueryAutocompleteValueSuggestion[],
  prefix: string,
): RankedSuggestion[] {
  const insertFor = (val: string): string => {
    const escaped = /\s/.test(val) ? `"${val}"` : val;
    return `${field}:${escaped}`;
  };
  if (prefix.length === 0) {
    return options.slice(0, SUGGESTIONS_LIMIT).map((o) => ({
      value: o.value,
      hint: o.hint,
      insert: insertFor(o.value),
    }));
  }
  const fuse = new Fuse(options, {
    keys: ['value'],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse
    .search(prefix)
    .slice(0, SUGGESTIONS_LIMIT)
    .map((r) => ({
      value: r.item.value,
      hint: r.item.hint,
      insert: insertFor(r.item.value),
    }));
}

function rankOperatorSuggestions(prefix: string): RankedSuggestion[] {
  const upper = prefix.toUpperCase();
  return OPERATOR_KEYWORDS.filter((kw) => kw.startsWith(upper)).map((kw) => ({
    value: kw,
    insert: kw,
  }));
}

export function QueryAutocomplete({
  value,
  onChange,
  onSubmit,
  fieldSuggestions,
  valueSuggestions,
  placeholder,
  showHelp = true,
  className,
  popoverClassName,
  disabled = false,
}: QueryAutocompleteProps): JSX.Element {
  const strings = useStrings();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  // Closed until the input is focused or edited, and again after Escape, a
  // blur or a pick that ends the token.
  const [dismissed, setDismissed] = useState(true);
  const [highlight, setHighlight] = useState(0);
  const [valuePool, setValuePool] = useState<
    QueryAutocompleteValueSuggestion[]
  >([]);
  const [valuePoolKey, setValuePoolKey] = useState<string | null>(null);
  const valueRequestId = useRef(0);

  const token = useMemo(() => tokenizeAtCursor(value, caret), [value, caret]);

  // Fetch value suggestions when entering / changing a `field:` token.
  useEffect(() => {
    if (token.kind !== 'value-start' || !valueSuggestions) {
      if (valuePoolKey !== null) {
        setValuePool([]);
        setValuePoolKey(null);
      }
      return;
    }
    const key = `${token.field}::${token.prefix}`;
    if (key === valuePoolKey) {
      return;
    }
    const requestId = valueRequestId.current + 1;
    valueRequestId.current = requestId;
    const result = valueSuggestions(token.field, token.prefix);
    if (Array.isArray(result)) {
      setValuePool(result);
      setValuePoolKey(key);
      return;
    }
    void result.then((items) => {
      if (valueRequestId.current === requestId) {
        setValuePool(items);
        setValuePoolKey(key);
      }
    });
  }, [token, valueSuggestions, valuePoolKey]);

  const suggestions = useMemo<RankedSuggestion[]>(() => {
    switch (token.kind) {
      case 'field-start':
        return rankFieldSuggestions(fieldSuggestions, token.prefix);
      case 'value-start':
        return rankValueSuggestions(token.field, valuePool, token.prefix);
      case 'operator':
        return rankOperatorSuggestions(token.prefix);
      case 'empty':
        return [];
    }
  }, [token, fieldSuggestions, valuePool]);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  const open = !dismissed && !disabled && suggestions.length > 0;
  const optionId = (index: number): string =>
    `${listId}-option-${String(index)}`;

  const syncCaret = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      setCaret(el.selectionStart ?? el.value.length);
    }
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      // selectionStart updates synchronously here.
      setCaret(e.target.selectionStart ?? e.target.value.length);
      setDismissed(false);
    },
    [onChange],
  );

  const commitSuggestion = useCallback(
    (suggestion: RankedSuggestion) => {
      const { value: next, caret: nextCaret } = replaceTokenAtCursor(
        value,
        caret,
        suggestion.insert,
      );
      onChange(next);
      setDismissed(suggestion.continues !== true);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCaret, nextCaret);
          setCaret(nextCaret);
        }
      });
    },
    [value, caret, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open && e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setDismissed(false);
        return;
      }
      if (open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlight((h) => (h + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlight(
            (h) => (h - 1 + suggestions.length) % suggestions.length,
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          commitSuggestion(suggestions[highlight]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setDismissed(true);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.(value);
      }
    },
    [open, suggestions, highlight, commitSuggestion, onSubmit, value],
  );

  const dropdown: ReactNode = (
    <ul
      id={listId}
      className={`aegis-query-ac__list ${popoverClassName ?? ''}`.trim()}
      role="listbox"
      aria-label={strings.suggestions}
    >
      {suggestions.map((s, i) => (
        <li
          key={`${s.value}-${String(i)}`}
          id={optionId(i)}
          role="option"
          aria-selected={i === highlight}
          className={`aegis-query-ac__item${i === highlight ? ' is-active' : ''}`}
          onMouseDown={(ev) => {
            ev.preventDefault();
            commitSuggestion(s);
          }}
          onMouseEnter={() => {
            setHighlight(i);
          }}
        >
          <span className="aegis-query-ac__item-value">{s.value}</span>
          {s.hint !== undefined ? (
            <span className="aegis-query-ac__item-hint">{s.hint}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );

  const helpContent: ReactNode = (
    <table className="aegis-query-ac__help">
      <tbody>
        {HELP_LINES.map((line) => (
          <tr key={line.syntax}>
            <td className="aegis-query-ac__help-syntax">{line.syntax}</td>
            <td className="aegis-query-ac__help-desc">
              {strings.querySyntax(line.kind)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const cls = ['aegis-query-ac', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <Popover
        content={dropdown}
        open={open}
        trigger={[]}
        placement="bottomLeft"
        arrow={false}
        classNames={{ root: 'aegis-query-ac__popover' }}
      >
        <input
          ref={inputRef}
          type="text"
          className="aegis-query-ac__input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onFocus={() => {
            syncCaret();
            setDismissed(false);
          }}
          onBlur={() => {
            setDismissed(true);
          }}
          placeholder={placeholder ?? strings.queryPlaceholder}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-label={strings.queryLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? optionId(highlight) : undefined}
        />
      </Popover>
      {showHelp ? (
        <Tooltip
          title={helpContent}
          placement="bottomRight"
          classNames={{ root: 'aegis-query-ac__help-overlay' }}
        >
          <span
            className="aegis-query-ac__help-icon"
            role="img"
            aria-label={strings.querySyntaxHelp}
          >
            <QuestionCircleOutlined />
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
}
