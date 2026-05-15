import { type ReactNode, useState } from 'react';

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
  /** Rendered in the toolbar row, before the `toolbar` slot. */
  searchSlot?: ReactNode;
  /** Rendered in the toolbar row after searchSlot — for a view-mode switch. */
  viewModeSlot?: ReactNode;
  /** Rendered below the body — pagination or "Load more". */
  footer?: ReactNode;
  /**
   * Absolutely positioned above the body — caller controls visibility based
   * on its own drag state.
   */
  dragOverlay?: ReactNode;
  /** When >0, surfaces a "n selected" pill in the toolbar bar. */
  selectionCount?: number;
  /** Hide the left tree pane entirely (flat listing mode). */
  hideTree?: boolean;
  /**
   * When true, collapses the prefix tree by default.  An internal toggle
   * button allows the user to expand/collapse it.
   */
  defaultTreeCollapsed?: boolean;
  /**
   * When true, shows 3 shimmer skeleton rows in the body instead of
   * `children`.
   */
  loading?: boolean;
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
  searchSlot,
  viewModeSlot,
  footer,
  dragOverlay,
  selectionCount = 0,
  hideTree = false,
  defaultTreeCollapsed = false,
  loading = false,
  className,
}: ObjectBrowserProps) {
  const [treeCollapsed, setTreeCollapsed] = useState(defaultTreeCollapsed);

  const showTree = !hideTree && !treeCollapsed;
  const cls = [
    'aegis-object-browser',
    hideTree || treeCollapsed ? 'aegis-object-browser--no-tree' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasToolbarRow =
    toolbar !== undefined ||
    searchSlot !== undefined ||
    viewModeSlot !== undefined ||
    selectionCount > 0;

  return (
    <div className={cls}>
      {!hideTree ? (
        <aside className="aegis-object-browser__tree" aria-label="Folders">
          <header className="aegis-object-browser__tree-head">
            <MetricLabel>{treeCollapsed ? 'Folders' : 'Folders'}</MetricLabel>
            <button
              type="button"
              className="aegis-object-browser__tree-toggle"
              onClick={() => {
                setTreeCollapsed((prev) => !prev);
              }}
              aria-label={treeCollapsed ? 'Expand folders' : 'Collapse folders'}
              title={treeCollapsed ? 'Expand' : 'Collapse'}
            >
              {treeCollapsed ? '›' : '‹'}
            </button>
          </header>
          {showTree ? (
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
          ) : null}
        </aside>
      ) : null}
      <section className="aegis-object-browser__main">
        {hasToolbarRow ? (
          <div className="aegis-object-browser__toolbar">
            {selectionCount > 0 ? (
              <span className="aegis-object-browser__selection">
                <MonoValue size="sm">{selectionCount.toString()}</MonoValue>
                <MetricLabel>selected</MetricLabel>
              </span>
            ) : null}
            {searchSlot !== undefined ? (
              <span className="aegis-object-browser__search-slot">
                {searchSlot}
              </span>
            ) : null}
            <span className="aegis-object-browser__toolbar-slot">
              {viewModeSlot}
              {toolbar}
            </span>
          </div>
        ) : null}
        <div className="aegis-object-browser__body-wrap">
          {dragOverlay !== undefined ? (
            <div className="aegis-object-browser__drag-overlay">
              {dragOverlay}
            </div>
          ) : null}
          <div className="aegis-object-browser__body">
            {loading ? (
              <div className="aegis-object-browser__skeleton" aria-busy="true">
                <div className="aegis-object-browser__skeleton-row aegis-skeleton-shimmer" />
                <div className="aegis-object-browser__skeleton-row aegis-skeleton-shimmer" />
                <div className="aegis-object-browser__skeleton-row aegis-skeleton-shimmer" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
        {footer !== undefined ? (
          <div className="aegis-object-browser__footer">{footer}</div>
        ) : null}
      </section>
    </div>
  );
}

export default ObjectBrowser;
