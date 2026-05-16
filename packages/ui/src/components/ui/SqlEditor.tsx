// SQL editor composition adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/SQLEditor/
import { type CSSProperties, useContext, useMemo } from 'react';

import {
  type Completion,
  autocompletion,
  completeFromList,
} from '@codemirror/autocomplete';
import { MySQL, sql } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';

import { ThemeContext } from '../../theme/themeContext';
import './SqlEditor.css';

export interface SqlField {
  /** Column or attribute key. */
  name: string;
  /** Optional ClickHouse type ('UInt64', 'Map(String,String)', ...) shown in the autocomplete hint. */
  type?: string;
}

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional submit handler — fires on Ctrl/Cmd+Enter. */
  onSubmit?: (value: string) => void;
  /** Optional schema for autocomplete. Adds field names + types to the SQL completion list. */
  fields?: SqlField[];
  /** Optional list of ClickHouse table names for FROM autocompletion. */
  tables?: string[];
  /** Initial height in px. Default 200. */
  height?: number;
  /** Disabled (readonly) state. */
  readOnly?: boolean;
  /** Placeholder text shown when value is empty. */
  placeholder?: string;
  /** Optional className. */
  className?: string;
  /** Override the colour scheme; defaults to the surrounding ThemeProvider. */
  theme?: 'light' | 'dark';
}

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'ON',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'LIKE',
  'BETWEEN',
  'IS NULL',
  'IS NOT NULL',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'DISTINCT',
  'HAVING',
  'WITH',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ASC',
  'DESC',
];

const baseTheme = EditorView.theme({
  '&': {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-13)',
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-main)',
  },
  '.cm-content': {
    caretColor: 'var(--text-main)',
    padding: 'var(--space-3) 0',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-muted)',
    color: 'var(--text-muted)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bg-muted)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-muted)',
    color: 'var(--text-main)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

function buildCompletions(
  fields: readonly SqlField[],
  tables: readonly string[],
): Completion[] {
  const keywordEntries: Completion[] = SQL_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
  }));
  const tableEntries: Completion[] = tables.map((t) => ({
    label: t,
    type: 'type',
    detail: 'table',
  }));
  const fieldEntries: Completion[] = fields.map((f) => ({
    label: f.name,
    type: 'variable',
    detail: f.type ?? 'field',
    info: f.type ? `${f.name} : ${f.type}` : undefined,
  }));
  return [...keywordEntries, ...tableEntries, ...fieldEntries];
}

export function SqlEditor({
  value,
  onChange,
  onSubmit,
  fields,
  tables,
  height = 200,
  readOnly = false,
  placeholder,
  className,
  theme,
}: SqlEditorProps) {
  const themeCtx = useContext(ThemeContext);
  const resolvedTheme: 'light' | 'dark' =
    theme ?? themeCtx?.resolved ?? 'light';

  const extensions = useMemo<Extension[]>(() => {
    const completions = buildCompletions(fields ?? [], tables ?? []);
    return [
      baseTheme,
      sql({ dialect: MySQL, upperCaseKeywords: true }),
      autocompletion({ override: [completeFromList(completions)] }),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: (view) => {
              if (onSubmit) {
                onSubmit(view.state.doc.toString());
                return true;
              }
              return false;
            },
          },
        ]),
      ),
    ];
  }, [fields, tables, onSubmit]);

  const rootClass = ['aegis-sql-editor', className ?? '']
    .filter(Boolean)
    .join(' ');
  const rootStyle: CSSProperties = { height: `${height.toString()}px` };

  return (
    <div className={rootClass} style={rootStyle}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        theme={resolvedTheme === 'dark' ? oneDark : 'light'}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}

export default SqlEditor;
