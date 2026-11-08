import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RightOutlined } from '@ant-design/icons';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useDevelopAfterLoad } from '../../hooks/useDevelopAfterLoad';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStrings } from '../../locale';
import { Checkbox } from './Checkbox';
import './DataTable.css';
import { EmptyState } from './EmptyState';
import { Pagination, type PaginationProps } from './Pagination';
import { Skeleton, SkeletonText } from './Skeleton';
import { useColumnWidths } from './useColumnWidths';

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
   * Set false for action cells, chip rows, links and other focusable content
   * (the clip cuts off their focus ring), or anything with non-text content
   * that should keep its natural width without being clipped.
   */
  truncate?: boolean;
  /**
   * Gives the header a resize handle on its right edge, dragged with the
   * pointer or moved with the arrow keys. Default false.
   */
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
  /**
   * Makes the header a sort control. With `sortValue` the table orders
   * the rows itself; without it the host orders `data` (for instance the
   * server, from a URL parameter) and the header only shows the state.
   */
  sortable?: boolean;
  /** The value the table sorts this column by; `null` sorts last either way. */
  sortValue?: (row: T) => number | string | null;
  /** The direction of a first click. Defaults to `desc` for numeric columns, `asc` otherwise. */
  firstSortDirection?: DataTableSortDirection;
  render: (row: T, index: number) => ReactNode;
}

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableSort {
  key: string;
  direction: DataTableSortDirection;
}

/**
 * Server-side pagination: `data` is the current page, never sliced here.
 * The table supplies the page's row count and disables the pager while
 * loading.
 */
export type DataTablePagination = Pick<
  PaginationProps,
  'page' | 'pageSize' | 'total' | 'onChange' | 'pageSizeOptions'
>;

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
  /**
   * The sorted column and direction. Omit to let the table track it,
   * starting from `defaultSort`. Row indices passed to `render`,
   * `cellTone` and the other callbacks count in the sorted order.
   */
  sort?: DataTableSort | null;
  defaultSort?: DataTableSort;
  /** Called with the sort a header click asks for. */
  onSortChange?: (sort: DataTableSort) => void;
  surface?: DataTableSurface<T>;
}

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

/**
 * The rows ordered by `column`'s sort value, ties and nulls (last in
 * either direction) keeping their order; unchanged when the column has no
 * sort value, because then the host ordered them.
 */
function sortRows<T>(
  data: T[],
  column: DataTableColumn<T> | undefined,
  direction: DataTableSortDirection,
): T[] {
  const value = column?.sortValue;
  if (!value) {
    return data;
  }
  const sign = direction === 'asc' ? 1 : -1;
  return data
    .map((row, index) => {
      const v = value(row);
      return { row, index, v: typeof v === 'number' && isNaN(v) ? null : v };
    })
    .sort((a, b) => {
      if (a.v === null || b.v === null) {
        return a.v === b.v ? a.index - b.index : a.v === null ? 1 : -1;
      }
      const order =
        typeof a.v === 'number' && typeof b.v === 'number'
          ? a.v - b.v
          : String(a.v).localeCompare(String(b.v));
      return order === 0 ? a.index - b.index : order * sign;
    })
    .map((entry) => entry.row);
}

function SortIcon({
  direction,
}: {
  direction: DataTableSortDirection | null;
}): ReactNode {
  return (
    <svg
      className="aegis-data-table__sort-icon"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        className={
          direction === 'asc' ? 'aegis-data-table__sort-mark--on' : undefined
        }
        d="M3.5 5L6 2.5 8.5 5"
      />
      <path
        className={
          direction === 'desc' ? 'aegis-data-table__sort-mark--on' : undefined
        }
        d="M3.5 7L6 9.5 8.5 7"
      />
    </svg>
  );
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
  sort,
  defaultSort,
  onSortChange,
  surface,
}: DataTableProps<T>) {
  const strings = useStrings();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const detailIdPrefix = useId();
  const cardMode = renderMobileCard !== undefined && isMobile;
  const develop = useDevelopAfterLoad(loading);

  const [uncontrolledSort, setUncontrolledSort] =
    useState<DataTableSort | null>(defaultSort ?? null);
  const activeSort = sort === undefined ? uncontrolledSort : sort;
  const sortColumn = columns.find((col) => col.key === activeSort?.key);
  const rows = useMemo(
    () => sortRows(data, sortColumn, activeSort?.direction ?? 'asc'),
    [data, sortColumn, activeSort?.direction],
  );
  const requestSort = (col: DataTableColumn<T>): void => {
    const first: DataTableSortDirection =
      col.firstSortDirection ?? (col.numeric ? 'desc' : 'asc');
    const next: DataTableSort = {
      key: col.key,
      direction:
        activeSort?.key === col.key
          ? activeSort.direction === 'asc'
            ? 'desc'
            : 'asc'
          : first,
    };
    if (sort === undefined) {
      setUncontrolledSort(next);
    }
    onSortChange?.(next);
  };

  const selected = selectedKeys ?? [];
  const keys = rows.map((row, index) => rowKey(row, index));
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
  const expandable = renderExpanded !== undefined;
  const clickable = onRowClick !== undefined;
  const leadWidth =
    (selectable ? SELECTION_WIDTH : 0) + (expandable ? TOGGLE_WIDTH : 0);
  const trailWidth = clickable ? CHEVRON_WIDTH : 0;

  const columnWidths = useColumnWidths({
    columns,
    persistKey,
    leadWidth,
    trailWidth,
    tableRef,
  });

  const cls = [
    'aegis-data-table',
    framed ? 'aegis-data-table--framed' : '',
    stale ? 'aegis-data-table--stale' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const fixedLayout = columnWidths.sized && !cardMode;
  const filler = fixedLayout && columnWidths.fillerStyle !== undefined;
  const sticky = stickyFirstColumn && !cardMode;
  const bodyColumnCount =
    (cardMode ? 1 : columns.length) + (filler ? 1 : 0) + (clickable ? 1 : 0);
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

  const fillerCell = filler && (
    <td className="aegis-data-table__td aegis-data-table__filler" aria-hidden />
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
          style={fixedLayout ? columnWidths.tableStyle : undefined}
        >
          {fixedLayout && (
            <colgroup>
              {selectable && (
                <col key="__select" style={{ width: SELECTION_WIDTH }} />
              )}
              {expandable && (
                <col key="__toggle" style={{ width: TOGGLE_WIDTH }} />
              )}
              {columns.map((col, i) => {
                const width = columnWidths.widths[i];
                return (
                  <col
                    key={col.key}
                    data-column-key={col.key}
                    style={width ? { width } : undefined}
                  />
                );
              })}
              {filler && (
                <col
                  key="__filler"
                  data-column-filler
                  style={columnWidths.fillerStyle}
                />
              )}
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
                      data-column-key={col.key}
                      className={cellClass('th', i)}
                      style={cellStyle(col, i)}
                      aria-sort={
                        col.sortable
                          ? activeSort?.key === col.key
                            ? activeSort.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          className="aegis-data-table__sort"
                          onClick={() => {
                            requestSort(col);
                          }}
                        >
                          <span className="aegis-data-table__th-label">
                            {col.header}
                          </span>
                          <SortIcon
                            direction={
                              activeSort?.key === col.key
                                ? activeSort.direction
                                : null
                            }
                          />
                        </button>
                      ) : (
                        <span className="aegis-data-table__th-label">
                          {col.header}
                        </span>
                      )}
                      {col.resizable && (
                        <span
                          aria-label="Resize column"
                          className="aegis-data-table__resizer"
                          {...columnWidths.handleProps(col)}
                        />
                      )}
                    </th>
                  ))
                )}
                {filler && (
                  <th
                    className="aegis-data-table__th aegis-data-table__filler"
                    aria-hidden
                  />
                )}
                {clickable && (
                  <th className="aegis-data-table__th aegis-data-table__chevron-cell" />
                )}
              </tr>
            </thead>
          )}
          <tbody data-aegis-develop={develop || undefined}>
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
                  {fillerCell}
                  {clickable && <td className="aegis-data-table__td" />}
                </tr>
              ))
            ) : rows.length === 0 ? (
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
              rows.map((row, idx) => {
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
                      {fillerCell}
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
        <Pagination
          {...pagination}
          pageRowCount={data.length}
          disabled={loading}
          className="aegis-data-table__footer"
        />
      )}
    </div>
  );
}
