import { type ReactNode } from 'react';

import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';
import './ObjectBrowser.css';

interface ObjectBrowserProps {
  /** Sub-prefixes at the current level (driver list with delimiter='/'). */
  prefixes: string[];
  /** Currently-selected prefix path, e.g. `"a/b/"` or `""` for root. */
  currentPrefix: string;
  onPrefixChange: (next: string) => void;
  /** Right-pane content — typically a DataTable of objects at this level. */
  children: ReactNode;
  /** Optional toolbar rendered above the right pane. */
  toolbar?: ReactNode;
  /** When >0, surfaces a "n selected" pill in the toolbar bar. */
  selectionCount?: number;
  /** Hide the left tree pane entirely (flat listing mode). */
  hideTree?: boolean;
  className?: string;
}

function lastSegment(prefix: string): string {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function parentPrefix(prefix: string): string {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? '' : `${trimmed.slice(0, idx)}/`;
}

export function ObjectBrowser({
  prefixes,
  currentPrefix,
  onPrefixChange,
  children,
  toolbar,
  selectionCount = 0,
  hideTree = false,
  className,
}: ObjectBrowserProps) {
  const cls = ['aegis-object-browser', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {hideTree ? null : (
        <aside className="aegis-object-browser__tree" aria-label="Folders">
          <header className="aegis-object-browser__tree-head">
            <MetricLabel>Folders</MetricLabel>
          </header>
          <ul className="aegis-object-browser__tree-list">
            {currentPrefix !== '' ? (
              <li>
                <button
                  type="button"
                  className="aegis-object-browser__tree-item aegis-object-browser__tree-item--up"
                  onClick={() => {
                    onPrefixChange(parentPrefix(currentPrefix));
                  }}
                >
                  <span aria-hidden="true">↑</span>
                  <MonoValue size="sm">..</MonoValue>
                </button>
              </li>
            ) : null}
            {prefixes.length === 0 && currentPrefix === '' ? (
              <li className="aegis-object-browser__tree-empty">
                <MetricLabel>no sub-prefixes</MetricLabel>
              </li>
            ) : null}
            {prefixes.map((p) => {
              const label = lastSegment(p);
              return (
                <li key={p}>
                  <button
                    type="button"
                    className="aegis-object-browser__tree-item"
                    onClick={() => {
                      onPrefixChange(p);
                    }}
                  >
                    <span aria-hidden="true">▸</span>
                    <MonoValue size="sm">{label}</MonoValue>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
      <section className="aegis-object-browser__main">
        {toolbar !== undefined || selectionCount > 0 ? (
          <div className="aegis-object-browser__toolbar">
            {selectionCount > 0 ? (
              <span className="aegis-object-browser__selection">
                <MonoValue size="sm">{selectionCount.toString()}</MonoValue>
                <MetricLabel>selected</MetricLabel>
              </span>
            ) : null}
            <span className="aegis-object-browser__toolbar-slot">
              {toolbar}
            </span>
          </div>
        ) : null}
        <div className="aegis-object-browser__body">{children}</div>
      </section>
    </div>
  );
}

export default ObjectBrowser;
