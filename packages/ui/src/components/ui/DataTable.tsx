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

import './DataTable.css';
import { EmptyState } from './EmptyState';

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
  render: (row: T, index: number) => ReactNode;
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
}

const DEFAULT_MIN_WIDTH = 60;

function toCssWidth(w: number | string | undefined): string | undefined {
  if (w === undefined) {
    return undefined;
  }
  return typeof w === 'number' ? `${w}px` : w;
}

function readPersisted(key: string): Record<string, number> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(`aegis-data-table:${key}`);
    if (!raw) {
      return {};
    }
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
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      `aegis-data-table:${key}`,
      JSON.stringify(widths),
    );
  } catch {
    /* quota or privacy-mode — silently drop */
  }
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
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
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
      if (e.key === `aegis-data-table:${persistKey}`) {
        setOverrides(readPersisted(persistKey));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [persistKey]);

  const cls = ['aegis-data-table', className ?? ''].filter(Boolean).join(' ');

  const cellStyle = (col: DataTableColumn<T>): CSSProperties => ({
    textAlign: col.align ?? 'left',
  });

  const renderCellContent = (col: DataTableColumn<T>, node: ReactNode) => {
    const truncate = col.truncate ?? true;
    const align = col.align ?? 'left';
    const classes = [
      'aegis-data-table__cell',
      `aegis-data-table__cell--${align}`,
    ];
    if (truncate) {
      classes.push('aegis-data-table__cell--truncate');
    }
    return <div className={classes.join(' ')}>{node}</div>;
  };

  return (
    <div className={cls}>
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
                        <span className="aegis-data-table__skeleton" />,
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
    </div>
  );
}

export default DataTable;
