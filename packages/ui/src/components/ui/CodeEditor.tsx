import { type CSSProperties, useCallback, useMemo, useRef } from 'react';

import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { MySQL, sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import CodeMirror, {
  type BasicSetupOptions,
  type Extension,
} from '@uiw/react-codemirror';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import './CodeEditor.css';

export type CodeEditorLanguage = 'json' | 'yaml' | 'sql' | 'text';

/** Schema hint for SQL autocompletion. */
export interface CodeEditorField {
  name: string;
  /** Optional ClickHouse type ('UInt64', 'Map(String,String)', …) shown alongside the suggestion. */
  type?: string;
}

export type CodeEditorSurface = PrimitiveSurface<{
  value: string;
  language: CodeEditorLanguage;
}>;

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeEditorLanguage;
  readOnly?: boolean;
  placeholder?: string;
  /** Editor height; numbers are treated as px. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  surface?: CodeEditorSurface;
  /**
   * SQL-only: schema columns surfaced in autocomplete (language='sql').
   * The editor reconfigures only when the names or types change.
   */
  fields?: CodeEditorField[];
  /** SQL-only: table names surfaced in autocomplete (language='sql'). */
  tables?: string[];
  /** Fires on Cmd/Ctrl+Enter — useful for run-this-query affordances. */
  onSubmit?: (value: string) => void;
}

// Module constants: @uiw/react-codemirror reconfigures the whole editor
// whenever `basicSetup`, `extensions` or `onChange` changes identity.
const BASIC_SETUP: BasicSetupOptions = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
};

interface SqlSchema {
  tables: string[];
  fields: CodeEditorField[];
}

// CodeMirror draws its chrome in its own palette; every surface it draws
// is mapped onto the tokens here. Selectors repeat the specificity of the rules they
// replace, and a theme's rules come after the base theme's, so they win.
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
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--text-main)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-muted)',
    color: 'var(--text-muted)',
    border: 'none',
  },
  // Only while typing, and translucent: the selection is drawn beneath the
  // lines.
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '&.cm-focused .cm-activeLine': {
    backgroundColor: 'var(--code-active-line)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-muted)',
    color: 'var(--text-main)',
  },
  '.cm-selectionBackground': {
    background: 'var(--code-selection-blur)',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: 'var(--code-selection)',
  },
  // The page's ::selection inverts the ink; selected code keeps its syntax
  // colours over --code-selection. `inherit` does not reach glyphs here.
  '.cm-content ::selection': {
    color: 'currentColor',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--bg-tint)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--bg-tint)',
    outline: 'var(--size-hairline) solid var(--border-emphasis)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'var(--code-selection)',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--bg-tint)',
    outline: 'var(--size-hairline) solid var(--border-emphasis)',
  },
  '&.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'var(--bg-warning-soft)',
    color: 'var(--accent-warning)',
  },
  '.cm-placeholder': {
    color: 'var(--text-muted)',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--bg-muted)',
    border: 'var(--size-hairline) solid var(--border-hairline)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--text-muted)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-main)',
    border: 'var(--size-hairline) solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-overlay)',
  },
  '.cm-tooltip-section:not(:first-child)': {
    borderTopColor: 'var(--border-hairline)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    padding: 'var(--space-1)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    lineHeight: 'var(--type-mono-line)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: 'var(--bg-inverted)',
    color: 'var(--text-on-inverted)',
  },
  '.cm-completionDetail': {
    fontStyle: 'normal',
    color: 'var(--text-muted)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionDetail': {
    color: 'var(--text-on-inverted-muted)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--bg-muted)',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-ui)',
  },
  '.cm-panels-top': {
    borderBottom: 'var(--size-hairline) solid var(--border-hairline)',
  },
  '.cm-panels-bottom': {
    borderTop: 'var(--size-hairline) solid var(--border-hairline)',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bg-panel)',
    border: 'var(--size-hairline) solid var(--border-emphasis)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-textfield:focus': {
    outline: 'none',
    borderColor: 'var(--accent-brand)',
    boxShadow: 'var(--focus-halo)',
  },
  '.cm-button, .cm-button:active': {
    backgroundImage: 'none',
    backgroundColor: 'var(--bg-panel)',
    border: 'var(--size-hairline) solid var(--border-emphasis)',
    borderRadius: 'var(--radius-pill)',
  },
  '.cm-search input[type=checkbox]': {
    accentColor: 'var(--bg-inverted)',
  },
  '.cm-search [name=close]': {
    color: 'var(--text-muted)',
    transition: 'color var(--motion-fast)',
  },
  '.cm-search [name=close]:hover': {
    color: 'var(--text-main)',
  },
  '.cm-button:focus-visible': {
    outline: 'var(--focus-ring-width) solid var(--focus-ring-color)',
    outlineOffset: 'var(--focus-ring-offset)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

const syntaxTheme = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: [tags.keyword, tags.typeName, tags.bool, tags.null, tags.atom],
      color: 'var(--syntax-keyword)',
    },
    { tag: [tags.string, tags.regexp], color: 'var(--syntax-string)' },
    { tag: tags.number, color: 'var(--syntax-number)' },
    {
      tag: [tags.propertyName, tags.attributeName],
      color: 'var(--syntax-property)',
    },
    { tag: [tags.comment, tags.meta], color: 'var(--syntax-comment)' },
    {
      tag: [tags.punctuation, tags.operator],
      color: 'var(--syntax-punctuation)',
    },
  ]),
);

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  placeholder,
  height = 240,
  className,
  style,
  surface,
  fields,
  tables,
  onSubmit,
}: CodeEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { value, language },
    'editor',
    wrapRef,
  );
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useIsomorphicLayoutEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  });
  const handleChange = useCallback((next: string) => {
    onChangeRef.current?.(next);
  }, []);

  const submittable = onSubmit !== undefined;
  // A string key, so a host passing fresh but equal arrays on every render
  // does not reconfigure the editor.
  const schemaKey = JSON.stringify({
    tables: tables ?? [],
    fields: fields ?? [],
  } satisfies SqlSchema);

  const extensions = useMemo<Extension[]>(() => {
    const exts: Extension[] = [baseTheme, syntaxTheme];
    if (language === 'json') {
      exts.push(json());
    } else if (language === 'yaml') {
      exts.push(yaml());
    } else if (language === 'sql') {
      exts.push(sql({ dialect: MySQL, upperCaseKeywords: true }));
      const schema = JSON.parse(schemaKey) as SqlSchema;
      const completions = [
        ...schema.tables.map((name) => ({
          label: name,
          type: 'class' as const,
        })),
        ...schema.fields.map((field) => ({
          label: field.name,
          type: 'property' as const,
          detail: field.type,
        })),
      ];
      if (completions.length > 0) {
        exts.push(
          autocompletion({ override: [completeFromList(completions)] }),
        );
      }
    }
    if (submittable) {
      exts.push(
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-Enter',
              run: (view) => {
                onSubmitRef.current?.(view.state.doc.toString());
                return true;
              },
            },
          ]),
        ),
      );
    }
    return exts;
  }, [language, schemaKey, submittable]);

  const rootClass = ['aegis-code-editor', className ?? '']
    .filter(Boolean)
    .join(' ');
  const rootStyle: CSSProperties = {
    height: typeof height === 'number' ? `${height.toString()}px` : height,
    ...style,
  };

  return (
    <div ref={wrapRef} className={rootClass} style={rootStyle} {...agentAttrs}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        theme="none"
        onChange={handleChange}
        basicSetup={BASIC_SETUP}
      />
    </div>
  );
}
