import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { readStorage, writeStorage } from '../../lib/storage';
import { useStrings } from '../../locale';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import './DataTable.css';
import { EmptyState } from './EmptyState';
import { PageSizeSelect } from './PageSizeSelect';
import { Skeleton, SkeletonText } from './Skeleton';

export type DataTableSurface<T> = PrimitiveSurface<T[]>;

/** Background wash of one cell, e.g. a step on a pass-rate scale. */
export interface DataTableCellTone {
  tone: 'success' | 'info' | 'caution' | 'warning';
  /**
   * 1 (default) is the tone's soft background; each step up mixes in more
   * of the tone's accent, to 5.
   */
  step?: 1 | 2 | 3 | 4 | 5;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Initial column width. Number → px, string → as-is (e.g. '20%'). */
  width?: number | string;
  /** Minimum width during resize / when content squeezes. Default 60px. */
  minWidth?: number;
  /** Maximum width during resize. */
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  /**
   * Whether the cell should ellipsis-truncate long content. Default true.
   * Set false for action cells, chip rows, or anything with non-text content
   * that should keep its natural width without being clipped.
   */
  truncate?: boolean;
  /** Allow dragging the right edge of this column to resize. Default false. */
  resizable?: boolean;
  /**
   * `'actions'` lays the cell out as a right-aligned, gapped, wrapping row of
   * controls — return them straight from `render`. Overrides `align` and
   * `truncate`.
   */
  kind?: 'actions';
  /**
   * Number column: header and cells right-aligned, figures in
   * `--font-numeric` with tabular widths so digits and decimal points line
   * up. Overrides `align`.
   */
  numeric?: boolean;
  /** Washes a cell's background in a tone. Table rows only, not mobile cards. */
  cellTone?: (row: T, index: number) => DataTableCellTone | undefined;
  render: (row: T, index: number) => ReactNode;
}

/** Server-side pagination: `data` is the current page, never sliced here. */
export interface DataTablePagination {
  /** 1-based. */
  page: number;
  pageSize: number;
  /**
   * Rows across all pages. Omit when the backend doesn't count them: the
   * range label drops "of N" and Next stays enabled while the page is full.
   */
  total?: number;
  /** Changing the page size always resets to page 1. */
  onChange: (page: number, pageSize: number) => void;
  /** Renders a "Rows per page" select offering these sizes. */
  pageSizeOptions?: number[];
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  /**
   * Draws the table as its own card: `--radius-lg`, hairline border and
   * resting shadow, with the header flush with the top and clipped by the
   * radius. Default true. Pass false where a container already frames the
   * table, e.g. a titled `Panel padded={false}`, a dialog or an expanded row.
   */
  framed?: boolean;
  /**
   * When set, resized column widths are persisted to localStorage under
   * `aegis-data-table:<persistKey>`. Use a stable key per table.
   */
  persistKey?: string;
  /** Renders a footer with page navigation under the table. */
  pagination?: DataTablePagination;
  /** Adds a leading checkbox column and drives `selectedKeys`. */
  selectable?: boolean;
  selectedKeys?: Array<string | number>;
  onSelectedKeysChange?: (keys: Array<string | number>) => void;
  /**
   * Makes rows expandable: a leading column of chevron toggles, and this
   * content full-width under each expanded row.
   */
  renderExpanded?: (row: T, index: number) => ReactNode;
  /** Controlled expanded row keys. Omit to let the table track them. */
  expandedKeys?: Array<string | number>;
  /** Rows expanded on mount when `expandedKeys` is omitted. */
  defaultExpandedKeys?: Array<string | number>;
  onExpandedKeysChange?: (keys: Array<string | number>) => void;
  /**
   * At ≤768 px, renders each row through this instead of the columns, as a
   * stacked list with no sideways scroll. Selection, expansion, row clicks,
   * loading, empty state and pagination keep working.
   */
  renderMobileCard?: (row: T, index: number) => ReactNode;
  /**
   * Makes rows clickable: pointer cursor, a muted hover background, a
   * trailing chevron, and Enter on a focused row. Links, buttons and form
   * controls inside a cell keep their own behaviour.
   */
  onRowClick?: (row: T, index: number) => void;
  /**
   * Keeps the first column (with the selection and expansion columns) in
   * view while the other columns scroll sideways.
   */
  stickyFirstColumn?: boolean;
  /**
   * The rows are out of date, e.g. the previous page while the next one
   * loads: they stay in place, dimmed, and the table is marked busy.
   */
  stale?: boolean;
  surface?: DataTableSurface<T>;
}

const DEFAULT_MIN_WIDTH = 60;
const AUTO_COLUMN_MIN_WIDTH = 120;
const SELECTION_WIDTH = 44;
const TOGGLE_WIDTH = 32;
const CHEVRON_WIDTH = 40;
const MOBILE_QUERY = '(max-width: 768px)';
const CONTROL_SELECTOR =
  'a, button, input, select, textarea, label, [role="button"], [role="link"], [role="checkbox"]';

/** True when the click belongs to a control inside the row, or ends a text selection. */
function isOwnedByControl(event: MouseEvent<HTMLElement>): boolean {
  if (window.getSelection()?.type === 'Range') {
    return true;
  }
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }
  const control = target.closest(CONTROL_SELECTOR);
  return control !== null && event.currentTarget.contains(control);
}

function toCssWidth(w: number | string | undefined): string | undefined {
  if (w === undefined) {
    return undefined;
  }
  return typeof w === 'number' ? `${w}px` : w;
}

function storageKey(persistKey: string): string {
  return `aegis-data-table:${persistKey}`;
}

function readPersisted(key: string): Record<string, number> {
  const raw = readStorage(storageKey(key));
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, number>;
    }
    return {};
  } catch {
    return {};
  }
}

function writePersisted(key: string, widths: Record<string, number>): void {
  writeStorage(storageKey(key), JSON.stringify(widths));
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  className,
  framed = true,
  persistKey,
  pagination,
  selectable = false,
  selectedKeys,
  onSelectedKeysChange,
  renderExpanded,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedKeysChange,
  renderMobileCard,
  onRowClick,
  stickyFirstColumn = false,
  stale = false,
  surface,
}: DataTableProps<T>) {
  const strings = useStrings();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const detailIdPrefix = useId();
  const cardMode = renderMobileCard !== undefined && isMobile;
  const selected = selectedKeys ?? [];
  const keys = data.map((row, index) => rowKey(row, index));
  const selectedCount = keys.filter((key) => selected.includes(key)).length;
  const toggleRow = (key: string | number, checked: boolean): void => {
    onSelectedKeysChange?.(
      checked ? [...selected, key] : selected.filter((item) => item !== key),
    );
  };
  // Selections on other pages survive toggling the rows of this page.
  const togglePage = (checked: boolean): void => {
    const others = selected.filter((key) => !keys.includes(key));
    onSelectedKeysChange?.(checked ? [...others, ...keys] : others);
  };
  const selectionCell = (
    checked: boolean,
    onToggle: (next: boolean) => void,
  ) => (
    <Checkbox
      checked={checked}
      onChange={onToggle}
      ariaLabel={strings.selectRow}
    />
  );

  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<
    Array<string | number>
  >(defaultExpandedKeys ?? []);
  const expanded = expandedKeys ?? uncontrolledExpanded;
  // A row's detail mounts the first time it opens and stays mounted, so
  // collapsing can animate instead of dropping the content at once.
  const [visited, setVisited] = useState(expanded);
  const unvisited = expanded.filter((key) => !visited.includes(key));
  if (unvisited.length > 0) {
    setVisited([...visited, ...unvisited]);
  }
  const toggleExpanded = (key: string | number): void => {
    const next = expanded.includes(key)
      ? expanded.filter((item) => item !== key)
      : [...expanded, key];
    if (expandedKeys === undefined) {
      setUncontrolledExpanded(next);
    }
    onExpandedKeysChange?.(next);
  };

  const tableRef = useRef<HTMLTableElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const agentAttrs = usePrimitiveSurface(surface, data, 'table', wrapRef);
  const [overrides, setOverrides] = useState<Record<string, number>>(() =>
    persistKey ? readPersisted(persistKey) : {},
  );

  useEffect(() => {
    if (persistKey) {
      writePersisted(persistKey, overrides);
    }
  }, [persistKey, overrides]);

  const hasAnyWidth = useMemo(
    () =>
      columns.some(
        (c) =>
          c.width !== undefined || c.resizable === true || c.key in overrides,
      ),
    [columns, overrides],
  );

  const colWidths = useMemo(
    () =>
      columns.map((c) => {
        if (c.key in overrides) {
          return `${overrides[c.key]}px`;
        }
        return toCssWidth(c.width);
      }),
    [columns, overrides],
  );

  const expandable = renderExpanded !== undefined;
  const clickable = onRowClick !== undefined;
  const leadWidth =
    (selectable ? SELECTION_WIDTH : 0) + (expandable ? TOGGLE_WIDTH : 0);
  const trailWidth = clickable ? CHEVRON_WIDTH : 0;

  // A fixed-layout table squeezes width-less columns to zero once the sized
  // ones fill the container; a min-width lets the scroll wrapper take over.
  const tableMinWidth = useMemo(() => {
    if (!hasAnyWidth) {
      return undefined;
    }
    const total = columns.reduce((sum, c) => {
      const px =
        c.key in overrides
          ? overrides[c.key]
          : typeof c.width === 'number'
            ? c.width
            : undefined;
      return sum + (px ?? c.minWidth ?? AUTO_COLUMN_MIN_WIDTH);
    }, leadWidth + trailWidth);
    return `${total.toString()}px`;
  }, [columns, overrides, hasAnyWidth, leadWidth, trailWidth]);

  const startResize = useCallback(
    (col: DataTableColumn<T>, colIndex: number) =>
      (event: ReactPointerEvent<HTMLSpanElement>): void => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();

        const table = tableRef.current;
        if (!table) {
          return;
        }
        const th = table.querySelectorAll('thead th')[colIndex];
        if (!(th instanceof HTMLElement)) {
          return;
        }

        const startX = event.clientX;
        const startWidth = th.getBoundingClientRect().width;
        const min = col.minWidth ?? DEFAULT_MIN_WIDTH;
        const max = col.maxWidth ?? Infinity;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (e: PointerEvent): void => {
          const next = Math.min(
            Math.max(startWidth + (e.clientX - startX), min),
            max,
          );
          setOverrides((prev) => ({ ...prev, [col.key]: Math.round(next) }));
        };

        const onUp = (): void => {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      },
    [],
  );

  // When the persisted layout changes (e.g. cross-tab), refresh.
  useIsomorphicLayoutEffect(() => {
    if (!persistKey || typeof window === 'undefined') {
      return undefined;
    }
    const onStorage = (e: StorageEvent): void => {
      if (e.key === storageKey(persistKey)) {
        setOverrides(readPersisted(persistKey));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [persistKey]);

  const cls = [
    'aegis-data-table',
    framed ? 'aegis-data-table--framed' : '',
    stale ? 'aegis-data-table--stale' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const fixedLayout = hasAnyWidth && !cardMode;
  const sticky = stickyFirstColumn && !cardMode;
  const bodyColumnCount = (cardMode ? 1 : columns.length) + (clickable ? 1 : 0);
  const columnCount =
    bodyColumnCount + (selectable ? 1 : 0) + (expandable ? 1 : 0);
  const toggleLeft = selectable ? SELECTION_WIDTH : 0;

  /** Props of a leading selection or toggle cell, fixed in width so the sticky offsets line up. */
  const leadCellProps = (lead: 'select' | 'toggle', cell: 'th' | 'td') => ({
    className: [
      `aegis-data-table__${cell}`,
      `aegis-data-table__${lead}-cell`,
      sticky ? `aegis-data-table__${cell}--sticky` : '',
    ]
      .filter(Boolean)
      .join(' '),
    style: {
      width: lead === 'select' ? SELECTION_WIDTH : TOGGLE_WIDTH,
      left: sticky ? (lead === 'select' ? 0 : toggleLeft) : undefined,
    },
  });

  /** Classes of a header or body cell of data column `colIndex`. */
  const cellClass = (
    cell: 'th' | 'td',
    colIndex: number,
    tone?: DataTableCellTone,
  ): string => {
    const block = `aegis-data-table__${cell}`;
    const classes = [block];
    if (sticky && colIndex === 0) {
      classes.push(`${block}--sticky`);
    }
    if (tone !== undefined) {
      classes.push(
        'aegis-data-table__td--tone',
        `aegis-data-table__td--tone-${tone.tone}`,
      );
      if (tone.step !== undefined && tone.step > 1) {
        classes.push(`aegis-data-table__td--step-${String(tone.step)}`);
      }
    }
    return classes.join(' ');
  };

  const columnAlign = (col: DataTableColumn<T>) =>
    col.kind === 'actions' || col.numeric === true
      ? 'right'
      : (col.align ?? 'left');

  const cellStyle = (
    col: DataTableColumn<T>,
    colIndex: number,
  ): CSSProperties => ({
    textAlign: columnAlign(col),
    left: sticky && colIndex === 0 ? leadWidth : undefined,
  });

  const renderCellContent = (col: DataTableColumn<T>, node: ReactNode) => {
    const classes = [
      'aegis-data-table__cell',
      `aegis-data-table__cell--${columnAlign(col)}`,
    ];
    if (col.numeric) {
      classes.push('aegis-data-table__cell--numeric');
    }
    if (col.kind === 'actions') {
      classes.push('aegis-data-table__cell--actions');
    } else if (col.truncate ?? true) {
      classes.push('aegis-data-table__cell--truncate');
    }
    return <div className={classes.join(' ')}>{node}</div>;
  };

  const renderRowCells = (row: T, idx: number) =>
    cardMode ? (
      <td className="aegis-data-table__td aegis-data-table__card-cell">
        {renderMobileCard(row, idx)}
      </td>
    ) : (
      columns.map((col, colIndex) => (
        <td
          key={col.key}
          className={cellClass('td', colIndex, col.cellTone?.(row, idx))}
          style={cellStyle(col, colIndex)}
        >
          {renderCellContent(col, col.render(row, idx))}
        </td>
      ))
    );

  const renderSkeletonCells = () =>
    cardMode ? (
      <td className="aegis-data-table__td aegis-data-table__card-cell">
        <SkeletonText lines={2} />
      </td>
    ) : (
      columns.map((col, colIndex) => (
        <td
          key={col.key}
          className={cellClass('td', colIndex)}
          style={cellStyle(col, colIndex)}
        >
          {renderCellContent(
            col,
            <Skeleton width="80%" height="var(--space-3)" />,
          )}
        </td>
      ))
    );

  const chevronCell = clickable && (
    <td className="aegis-data-table__td aegis-data-table__chevron-cell">
      <RightOutlined className="aegis-data-table__chevron" aria-hidden />
    </td>
  );

  const renderToggle = (key: string | number, detailId: string) => {
    const open = expanded.includes(key);
    return (
      <button
        type="button"
        className="aegis-data-table__toggle"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={open ? strings.collapseRow : strings.expandRow}
        onClick={() => {
          toggleExpanded(key);
        }}
      >
        <RightOutlined className="aegis-data-table__toggle-icon" aria-hidden />
      </button>
    );
  };

  const renderDetailRow = (
    row: T,
    idx: number,
    key: string | number,
    detailId: string,
    render: (row: T, index: number) => ReactNode,
  ) => {
    const open = expanded.includes(key);
    return (
      <tr
        className={
          open
            ? 'aegis-data-table__detail-row aegis-data-table__detail-row--open'
            : 'aegis-data-table__detail-row'
        }
      >
        {selectable && <td className="aegis-data-table__detail-cell" />}
        <td className="aegis-data-table__detail-cell" />
        <td
          id={detailId}
          colSpan={bodyColumnCount}
          className="aegis-data-table__detail-cell"
        >
          <div className="aegis-data-table__detail">
            <div className="aegis-data-table__detail-clip">
              <div className="aegis-data-table__detail-body">
                {(open || visited.includes(key)) && render(row, idx)}
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    row: T,
    idx: number,
  ): void => {
    if (!isOwnedByControl(event)) {
      onRowClick?.(row, idx);
    }
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: T,
    idx: number,
  ): void => {
    if (event.key === 'Enter' && event.target === event.currentTarget) {
      event.preventDefault();
      onRowClick?.(row, idx);
    }
  };

  const rowClass = [
    'aegis-data-table__row',
    clickable ? 'aegis-data-table__row--clickable' : '',
    expandable ? 'aegis-data-table__row--expandable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const tableClass = [
    'aegis-data-table__table',
    fixedLayout ? 'aegis-data-table__table--fixed' : '',
    cardMode ? 'aegis-data-table__table--cards' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      aria-busy={stale ? true : undefined}
      {...agentAttrs}
    >
      <div className="aegis-data-table__scroll">
        <table
          ref={tableRef}
          className={tableClass}
          style={
            tableMinWidth && fixedLayout
              ? { minWidth: tableMinWidth }
              : undefined
          }
        >
          {fixedLayout && (
            <colgroup>
              {selectable && (
                <col key="__select" style={{ width: SELECTION_WIDTH }} />
              )}
              {expandable && (
                <col key="__toggle" style={{ width: TOGGLE_WIDTH }} />
              )}
              {columns.map((col, i) => (
                <col
                  key={col.key}
                  style={colWidths[i] ? { width: colWidths[i] } : undefined}
                />
              ))}
              {clickable && (
                <col key="__chevron" style={{ width: CHEVRON_WIDTH }} />
              )}
            </colgroup>
          )}
          {(!cardMode || selectable) && (
            <thead>
              <tr>
                {selectable && (
                  <th key="__select" {...leadCellProps('select', 'th')}>
                    <span className="aegis-data-table__th-label">
                      <Checkbox
                        checked={
                          keys.length > 0 && selectedCount === keys.length
                        }
                        indeterminate={
                          selectedCount > 0 && selectedCount < keys.length
                        }
                        onChange={togglePage}
                        ariaLabel={strings.selectAllRows}
                      />
                    </span>
                  </th>
                )}
                {expandable && (
                  <th key="__toggle" {...leadCellProps('toggle', 'th')} />
                )}
                {cardMode ? (
                  <th className="aegis-data-table__th" />
                ) : (
                  columns.map((col, i) => (
                    <th
                      key={col.key}
                      className={cellClass('th', i)}
                      style={cellStyle(col, i)}
                    >
                      <span className="aegis-data-table__th-label">
                        {col.header}
                      </span>
                      {col.resizable && (
                        <span
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Resize column"
                          className="aegis-data-table__resizer"
                          onPointerDown={startResize(col, i)}
                        />
                      )}
                    </th>
                  ))
                )}
                {clickable && (
                  <th className="aegis-data-table__th aegis-data-table__chevron-cell" />
                )}
              </tr>
            </thead>
          )}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="aegis-data-table__row">
                  {selectable && (
                    <td key="__select" {...leadCellProps('select', 'td')} />
                  )}
                  {expandable && (
                    <td key="__toggle" {...leadCellProps('toggle', 'td')} />
                  )}
                  {renderSkeletonCells()}
                  {clickable && <td className="aegis-data-table__td" />}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="aegis-data-table__empty-cell"
                >
                  <div className="aegis-data-table__empty">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = rowKey(row, idx);
                const detailId = `${detailIdPrefix}-detail-${String(idx)}`;
                return (
                  <Fragment key={key}>
                    <tr
                      className={rowClass}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={
                        clickable
                          ? (event) => {
                              handleRowClick(event, row, idx);
                            }
                          : undefined
                      }
                      onKeyDown={
                        clickable
                          ? (event) => {
                              handleRowKeyDown(event, row, idx);
                            }
                          : undefined
                      }
                    >
                      {selectable && (
                        <td {...leadCellProps('select', 'td')}>
                          {selectionCell(selected.includes(key), (checked) => {
                            toggleRow(key, checked);
                          })}
                        </td>
                      )}
                      {expandable && (
                        <td {...leadCellProps('toggle', 'td')}>
                          {renderToggle(key, detailId)}
                        </td>
                      )}
                      {renderRowCells(row, idx)}
                      {chevronCell}
                    </tr>
                    {expandable &&
                      renderDetailRow(row, idx, key, detailId, renderExpanded)}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <DataTableFooter
          pagination={pagination}
          rowCount={data.length}
          loading={loading}
        />
      )}
    </div>
  );
}

interface DataTableFooterProps {
  pagination: DataTablePagination;
  rowCount: number;
  loading: boolean;
}

function DataTableFooter({
  pagination,
  rowCount,
  loading,
}: DataTableFooterProps) {
  const strings = useStrings();
  const { page, pageSize, total, onChange, pageSizeOptions } = pagination;
  const offset = (page - 1) * pageSize;
  const shown =
    total === undefined
      ? rowCount
      : Math.max(0, Math.min(pageSize, total - offset));
  const hasNext =
    total === undefined ? rowCount >= pageSize : offset + pageSize < total;

  return (
    <div className="aegis-data-table__footer">
      {pageSizeOptions && (
        <PageSizeSelect
          value={pageSize}
          options={pageSizeOptions}
          onChange={(size) => {
            onChange(1, size);
          }}
        />
      )}
      <div className="aegis-data-table__pager">
        <span className="aegis-data-table__range">
          <span className="aegis-data-table__range-num">
            {shown > 0
              ? `${(offset + 1).toLocaleString()}–${(offset + shown).toLocaleString()}`
              : '0'}
          </span>
          {total !== undefined && (
            <>
              {strings.rangeOf}
              <span className="aegis-data-table__range-num">
                {total.toLocaleString()}
              </span>
            </>
          )}
        </span>
        <Button
          tone="secondary"
          className="aegis-data-table__page-btn"
          aria-label={strings.previousPage}
          disabled={loading || page <= 1}
          onClick={() => {
            onChange(page - 1, pageSize);
          }}
        >
          <LeftOutlined />
        </Button>
        <Button
          tone="secondary"
          className="aegis-data-table__page-btn"
          aria-label={strings.nextPage}
          disabled={loading || !hasNext}
          onClick={() => {
            onChange(page + 1, pageSize);
          }}
        >
          <RightOutlined />
        </Button>
      </div>
    </div>
  );
}
