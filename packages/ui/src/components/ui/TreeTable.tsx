import {
  type CSSProperties,
  type FocusEvent,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  memo,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RightOutlined } from '@ant-design/icons';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStrings } from '../../locale';
import { EmptyState } from './EmptyState';
import './TreeTable.css';
import { SelectedRowDetailContext } from './selectedRowDetail';

/** What a cell can know of its row beyond the row itself. */
export interface TreeTableRowState {
  /** The row has children and they are shown. */
  expanded: boolean;
}

export interface TreeTableColumn<T> {
  key: string;
  header: ReactNode;
  /**
   * The column's track in the grid every row shares: a number of px, or any
   * `grid-template-columns` track such as `'minmax(0, 2fr)'`. Default
   * `minmax(0, 1fr)`. Rows never measure their cells, so a long cell wraps
   * or truncates instead of widening its column.
   */
  width?: number | string;
  /** Number column: header and cells right-aligned, figures in tabular widths. */
  numeric?: boolean;
  /** Cuts the cell off with an ellipsis on one line instead of wrapping it. */
  truncate?: boolean;
  render: (row: T, state: TreeTableRowState) => ReactNode;
}

export interface TreeTableProps<T> {
  /**
   * The columns; the first draws each row's indent and expand caret. Keep
   * the array the same between renders, e.g. from `useMemo`, so a large
   * tree redraws only the rows that change.
   */
  columns: Array<TreeTableColumn<T>>;
  /** The top-level rows, in the order they are drawn. */
  data: T[];
  rowKey: (row: T) => string;
  /** A row's children in the order they are drawn; empty or undefined for a leaf. */
  getSubRows: (row: T) => T[] | undefined;
  /** The table's accessible name. */
  ariaLabel: string;
  /** The open rows. Omit it to let the table track them. */
  expandedKeys?: string[];
  /** Rows open on first render when `expandedKeys` is omitted. */
  defaultExpandedKeys?: string[];
  /** Called with the open rows whenever one opens or closes. */
  onExpandedKeysChange?: (keys: string[]) => void;
  /**
   * The selected row: `aria-selected`, drawn selected, and followed by an
   * enclosing `DetailBeside`. Whenever it changes, the rows above it open,
   * unless `expandedKeys` controls them.
   */
  selectedKey?: string | null;
  /** Called with a row when it is clicked or activated with Enter or Space. */
  onSelect?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Draws the table as its own card, as `DataTable` does. Default true.
   * Pass false where a container already frames it.
   */
  framed?: boolean;
  className?: string;
}

interface VisibleRow<T> {
  row: T;
  key: string;
  parentKey: string | null;
  depth: number;
  /** 1-based position among its siblings. */
  position: number;
  siblings: number;
  hasChildren: boolean;
}

const FOLDED_QUERY = '(max-width: 768px)';
const ROW_ATTRIBUTE = 'data-aegis-tree-table-row';
const CARET_ATTRIBUTE = 'data-aegis-tree-table-caret';
const CONTROL_SELECTOR =
  'a, button, input, select, textarea, label, [role="button"], [role="link"], [role="checkbox"]';

function track(width: number | string | undefined): string {
  if (width === undefined) {
    return 'minmax(0, 1fr)';
  }
  return typeof width === 'number' ? `${String(width)}px` : width;
}

/** The keys of the rows above the row `key`, outermost first; empty when no row has it. */
function ancestorKeys<T>(
  rows: T[],
  key: string,
  rowKey: (row: T) => string,
  getSubRows: (row: T) => T[] | undefined,
  above: string[] = [],
): string[] {
  for (const row of rows) {
    const own = rowKey(row);
    if (own === key) {
      return above;
    }
    const found = ancestorKeys(getSubRows(row) ?? [], key, rowKey, getSubRows, [
      ...above,
      own,
    ]);
    if (found.length > 0) {
      return found;
    }
  }
  return [];
}

function visibleRows<T>(
  rows: T[],
  open: ReadonlySet<string>,
  rowKey: (row: T) => string,
  getSubRows: (row: T) => T[] | undefined,
  parentKey: string | null = null,
  depth = 0,
  out: Array<VisibleRow<T>> = [],
): Array<VisibleRow<T>> {
  rows.forEach((row, index) => {
    const key = rowKey(row);
    const children = getSubRows(row) ?? [];
    out.push({
      row,
      key,
      parentKey,
      depth,
      position: index + 1,
      siblings: rows.length,
      hasChildren: children.length > 0,
    });
    if (children.length > 0 && open.has(key)) {
      visibleRows(children, open, rowKey, getSubRows, key, depth + 1, out);
    }
  });
  return out;
}

/** True when the click belongs to a control inside the row, or ends a text selection. */
function isOwnedByControl(target: Element, row: Element): boolean {
  if (window.getSelection()?.type === 'Range') {
    return true;
  }
  const control = target.closest(CONTROL_SELECTOR);
  return control !== null && row.contains(control);
}

interface TreeTableRowProps<T> {
  row: T;
  rowKey: string;
  depth: number;
  position: number;
  siblings: number;
  hasChildren: boolean;
  expanded: boolean;
  selectable: boolean;
  selected: boolean;
  tabbable: boolean;
  folded: boolean;
  columns: Array<TreeTableColumn<T>>;
  placeRow: ((row: HTMLElement | null) => void) | undefined;
}

function TreeTableRowView<T>({
  row,
  rowKey,
  depth,
  position,
  siblings,
  hasChildren,
  expanded,
  selectable,
  selected,
  tabbable,
  folded,
  columns,
  placeRow,
}: TreeTableRowProps<T>): ReactElement {
  const state: TreeTableRowState = { expanded: hasChildren && expanded };
  const cls = [
    'aegis-tree-table__row',
    selectable ? 'aegis-tree-table__row--selectable' : '',
    selected ? 'aegis-tree-table__row--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={placeRow}
      className={cls}
      role="row"
      data-aegis-tree-table-row={rowKey}
      aria-level={depth + 1}
      aria-posinset={position}
      aria-setsize={siblings}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selectable ? selected : undefined}
      tabIndex={tabbable ? 0 : -1}
      style={{ '--aegis-tree-table-depth': depth } as CSSProperties}
    >
      {columns.map((column, index) => {
        const cellCls = [
          'aegis-tree-table__cell',
          index === 0 ? 'aegis-tree-table__cell--tree' : '',
          column.numeric ? 'aegis-tree-table__cell--numeric' : '',
          column.truncate ? 'aegis-tree-table__cell--truncate' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={column.key} className={cellCls} role="gridcell">
            {index === 0 && (
              <span
                className="aegis-tree-table__caret"
                aria-hidden="true"
                data-aegis-tree-table-caret={hasChildren ? '' : undefined}
              >
                {hasChildren && (
                  <RightOutlined className="aegis-tree-table__chevron" />
                )}
              </span>
            )}
            {folded && index > 0 && (
              <span className="aegis-tree-table__label">{column.header}</span>
            )}
            <div className="aegis-tree-table__content">
              {column.render(row, state)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TreeTableRow = memo(TreeTableRowView) as typeof TreeTableRowView;

/**
 * A table whose rows form a tree: each row's first cell carries its indent
 * and a caret that opens its children, and every row shares the columns.
 * For assistive technology it is a treegrid with one tab stop: ↑ ↓ Home
 * End move between rows, → opens a row or moves into it, ← closes it or
 * moves to its parent, and Enter or Space selects. At 768 px and below each
 * row folds: its first cell on top, the other cells under it, each named by
 * its header, and a cell that draws nothing left out. Inside a
 * `DetailBeside` the selected row carries the detail.
 */
export function TreeTable<T>({
  columns,
  data,
  rowKey,
  getSubRows,
  ariaLabel,
  expandedKeys,
  defaultExpandedKeys = [],
  onExpandedKeysChange,
  selectedKey,
  onSelect,
  emptyTitle,
  emptyDescription,
  framed = true,
  className,
}: TreeTableProps<T>) {
  const strings = useStrings();
  const folded = useMediaQuery(FOLDED_QUERY);
  const selection = useContext(SelectedRowDetailContext);
  const gridRef = useRef<HTMLDivElement>(null);
  const revealTarget = selectedKey ?? null;
  const [trackedKeys, setTrackedKeys] = useState<string[]>(() => [
    ...defaultExpandedKeys,
    ...(revealTarget === null
      ? []
      : ancestorKeys(data, revealTarget, rowKey, getSubRows)),
  ]);
  const [revealedKey, setRevealedKey] = useState(revealTarget);
  if (revealTarget !== revealedKey) {
    setRevealedKey(revealTarget);
    if (revealTarget !== null) {
      setTrackedKeys([
        ...new Set([
          ...trackedKeys,
          ...ancestorKeys(data, revealTarget, rowKey, getSubRows),
        ]),
      ]);
    }
  }
  const openKeys = expandedKeys ?? trackedKeys;
  const open = useMemo(() => new Set(openKeys), [openKeys]);
  const rows = visibleRows(data, open, rowKey, getSubRows);
  const [focusedKey, setFocusedKey] = useState<string>();
  const tabStop =
    [focusedKey, selectedKey].find((key) =>
      rows.some((entry) => entry.key === key),
    ) ?? rows[0]?.key;
  const selectable = onSelect !== undefined || selectedKey !== undefined;

  const setExpanded = (key: string, value: boolean): void => {
    const next = value
      ? [...openKeys, key]
      : openKeys.filter((item) => item !== key);
    if (expandedKeys === undefined) {
      setTrackedKeys(next);
    }
    onExpandedKeysChange?.(next);
  };

  /** The index of the table's own row an event came from; -1 for anything else, such as a detail among the rows. */
  const rowIndexOf = (target: EventTarget): number => {
    if (!(target instanceof Element)) {
      return -1;
    }
    const element = target.closest(`[${ROW_ATTRIBUTE}]`);
    if (element === null || element.parentElement !== gridRef.current) {
      return -1;
    }
    const key = element.getAttribute(ROW_ATTRIBUTE);
    return rows.findIndex((entry) => entry.key === key);
  };

  const focusRow = (index: number): void => {
    const element = gridRef.current
      ?.querySelectorAll(`:scope > [${ROW_ATTRIBUTE}]`)
      .item(index);
    if (element instanceof HTMLElement) {
      element.focus();
    }
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    const index = rowIndexOf(event.target);
    if (index < 0 || !(event.target instanceof Element)) {
      return;
    }
    const entry = rows[index];
    if (event.target.closest(`[${CARET_ATTRIBUTE}]`) !== null) {
      setExpanded(entry.key, !open.has(entry.key));
    } else if (!isOwnedByControl(event.target, event.currentTarget)) {
      onSelect?.(entry.row);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = rowIndexOf(event.target);
    // Keys typed into a control inside a row stay the control's.
    if (
      index < 0 ||
      !(event.target instanceof Element) ||
      !event.target.hasAttribute(ROW_ATTRIBUTE)
    ) {
      return;
    }
    const entry = rows[index];
    const expanded = entry.hasChildren && open.has(entry.key);
    switch (event.key) {
      case 'ArrowDown':
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        focusRow(index - 1);
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(rows.length - 1);
        break;
      case 'ArrowRight':
        if (expanded) {
          focusRow(index + 1);
        } else if (entry.hasChildren) {
          setExpanded(entry.key, true);
        }
        break;
      case 'ArrowLeft':
        if (expanded) {
          setExpanded(entry.key, false);
        } else if (entry.parentKey !== null) {
          const { parentKey } = entry;
          focusRow(rows.findIndex((each) => each.key === parentKey));
        }
        break;
      case 'Enter':
      case ' ':
        onSelect?.(entry.row);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>): void => {
    const index = rowIndexOf(event.target);
    if (index >= 0 && event.target.hasAttribute(ROW_ATTRIBUTE)) {
      setFocusedKey(rows[index].key);
    }
  };

  const cls = [
    'aegis-tree-table',
    framed ? 'aegis-tree-table--framed' : '',
    folded ? 'aegis-tree-table--folded' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = {
    '--aegis-tree-table-columns': columns
      .map((column) => track(column.width))
      .join(' '),
  } as CSSProperties;

  return (
    <div className={cls} style={style}>
      <div
        ref={gridRef}
        className="aegis-tree-table__grid"
        role="treegrid"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {!folded && (
          <div className="aegis-tree-table__head" role="row">
            {columns.map((column) => (
              <div
                key={column.key}
                className={
                  column.numeric
                    ? 'aegis-tree-table__th aegis-tree-table__th--numeric'
                    : 'aegis-tree-table__th'
                }
                role="columnheader"
              >
                {column.header}
              </div>
            ))}
          </div>
        )}
        {rows.map((entry) => {
          const selected = selectedKey === entry.key;
          return (
            <Fragment key={entry.key}>
              <TreeTableRow
                row={entry.row}
                rowKey={entry.key}
                depth={entry.depth}
                position={entry.position}
                siblings={entry.siblings}
                hasChildren={entry.hasChildren}
                expanded={open.has(entry.key)}
                selectable={selectable}
                selected={selected}
                tabbable={entry.key === tabStop}
                folded={folded}
                columns={columns}
                placeRow={selected ? selection?.placeRow : undefined}
              />
              {selected && selection?.inline ? (
                <div className="aegis-tree-table__inline" role="row">
                  <div role="gridcell">{selection.inline}</div>
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {rows.length === 0 && (
        <EmptyState
          title={emptyTitle ?? strings.noData}
          description={emptyDescription}
        />
      )}
    </div>
  );
}
