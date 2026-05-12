import { type CSSProperties, useMemo, useRef } from 'react';

import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './CodeEditor.css';

export type CodeEditorLanguage = 'json' | 'yaml' | 'text';

export interface CodeEditorSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    value: string;
    language: CodeEditorLanguage;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeEditorLanguage;
  readOnly?: boolean;
  /** CodeMirror theme variant — 'auto' follows the host's color-scheme. */
  theme?: 'light' | 'dark' | 'auto';
  placeholder?: string;
  /** Editor height; numbers are treated as px. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  surface?: CodeEditorSurface;
}

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

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  theme = 'auto',
  placeholder,
  height = 240,
  className,
  style,
  surface,
}: CodeEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<{ value: string; language: CodeEditorLanguage }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'editor',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { value, language },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const extensions = useMemo<Extension[]>(() => {
    const exts: Extension[] = [baseTheme];
    if (language === 'json') {
      exts.push(json());
    } else if (language === 'yaml') {
      exts.push(yaml());
    }
    return exts;
  }, [language]);

  const rootClass = ['aegis-code-editor', className ?? '']
    .filter(Boolean)
    .join(' ');
  const rootStyle: CSSProperties = {
    height: typeof height === 'number' ? `${height.toString()}px` : height,
    ...style,
  };

  return (
    <div
      ref={wrapRef}
      className={rootClass}
      style={rootStyle}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        theme={theme === 'auto' ? 'none' : theme}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
        }}
      />
    </div>
  );
}

export default CodeEditor;
