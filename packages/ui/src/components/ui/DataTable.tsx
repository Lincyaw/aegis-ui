import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { readStorage, writeStorage } from '../../lib/storage';
import { Button } from './Button';
import './DataTable.css';
import { EmptyState } from './EmptyState';
import { PageSizeSelect } from './PageSizeSelect';
import { Skeleton } from './Skeleton';

export type DataTableSurface<T> = PrimitiveSurface<T[]>;

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
   * When set, resized column widths are persisted to localStorage under
   * `aegis-data-table:<persistKey>`. Use a stable key per table.
   */
  persistKey?: string;
  /** Renders a footer with page navigation under the table. */
  pagination?: DataTablePagination;
  surface?: DataTableSurface<T>;
}

const DEFAULT_MIN_WIDTH = 60;

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
  persistKey,
  pagination,
  surface,
}: DataTableProps<T>) {
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
  useLayoutEffect(() => {
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

  const cls = ['aegis-data-table', className ?? ''].filter(Boolean).join(' ');

  const columnAlign = (col: DataTableColumn<T>) =>
    col.kind === 'actions' ? 'right' : (col.align ?? 'left');

  const cellStyle = (col: DataTableColumn<T>): CSSProperties => ({
    textAlign: columnAlign(col),
  });

  const renderCellContent = (col: DataTableColumn<T>, node: ReactNode) => {
    const classes = [
      'aegis-data-table__cell',
      `aegis-data-table__cell--${columnAlign(col)}`,
    ];
    if (col.kind === 'actions') {
      classes.push('aegis-data-table__cell--actions');
    } else if (col.truncate ?? true) {
      classes.push('aegis-data-table__cell--truncate');
    }
    return <div className={classes.join(' ')}>{node}</div>;
  };

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <div className="aegis-data-table__scroll">
        <table
          ref={tableRef}
          className={
            hasAnyWidth
              ? 'aegis-data-table__table aegis-data-table__table--fixed'
              : 'aegis-data-table__table'
          }
        >
          {hasAnyWidth && (
            <colgroup>
              {columns.map((col, i) => (
                <col
                  key={col.key}
                  style={colWidths[i] ? { width: colWidths[i] } : undefined}
                />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className="aegis-data-table__th"
                  style={cellStyle(col)}
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
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="aegis-data-table__row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="aegis-data-table__td"
                      style={cellStyle(col)}
                    >
                      {renderCellContent(
                        col,
                        <Skeleton width="80%" height="var(--space-3)" />,
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="aegis-data-table__empty-cell"
                >
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={rowKey(row, idx)} className="aegis-data-table__row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="aegis-data-table__td"
                      style={cellStyle(col)}
                    >
                      {renderCellContent(col, col.render(row, idx))}
                    </td>
                  ))}
                </tr>
              ))
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
              {' of '}
              <span className="aegis-data-table__range-num">
                {total.toLocaleString()}
              </span>
            </>
          )}
        </span>
        <Button
          tone="secondary"
          className="aegis-data-table__page-btn"
          aria-label="Previous page"
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
          aria-label="Next page"
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
