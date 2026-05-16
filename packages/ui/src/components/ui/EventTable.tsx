// Virtualized table mechanics adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/DBRowTable.tsx
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type UIEvent as ReactUIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { EmptyState } from './EmptyState';
import './EventTable.css';

export interface EventTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Column width in px. Use 'flex' to take remaining space. Default 'flex'. */
  width?: number | 'flex';
  /** Align cell content. Default 'left'. */
  align?: 'left' | 'right' | 'center';
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  /** When true, do not ellipsize overflowing text. */
  truncate?: boolean;
}

export interface EventTableProps<T> {
  columns: Array<EventTableColumn<T>>;
  data: T[];
  /** Stable row key. */
  rowKey: (row: T) => string;
  /** Optional row-click handler — caller mounts a side panel. */
  onRowClick?: (row: T) => void;
  /** Visually mark a row as selected/highlighted. */
  selectedKey?: string;
  /** Loading skeleton above the (possibly empty) body. */
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Approximate row height in px — used by the virtualizer. Default 32. */
  estimatedRowHeight?: number;
  /** Max visible rows before vertical scroll kicks in. Default 20. */
  maxVisibleRows?: number;
  /** When provided, append-on-bottom: invoked when the user scrolls within `loadMoreThresholdPx` of the bottom. */
  onLoadMore?: () => void;
  /** Distance from bottom that triggers onLoadMore. Default 200. */
  loadMoreThresholdPx?: number;
  /** ClassName appended to the root. */
  className?: string;
}

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_MAX_VISIBLE_ROWS = 20;
const DEFAULT_LOAD_MORE_THRESHOLD = 200;
const LOAD_MORE_DEBOUNCE_MS = 80;
const SKELETON_ROW_COUNT = 6;
const OVERSCAN = 8;

export function EventTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectedKey,
  loading,
  emptyTitle = 'No events',
  emptyDescription,
  estimatedRowHeight = DEFAULT_ROW_HEIGHT,
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
  onLoadMore,
  loadMoreThresholdPx = DEFAULT_LOAD_MORE_THRESHOLD,
  className,
}: EventTableProps<T>) {
  const tableColumns = useMemo<Array<ColumnDef<T>>>(
    () =>
      columns.map((c) => ({
        id: c.key,
        header: () => c.header,
        cell: ({ row }) => c.render(row.original),
        size: c.width === 'flex' || c.width === undefined ? undefined : c.width,
      })),
    [columns],
  );

  const table = useReactTable<T>({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: OVERSCAN,
  });

  const loadMoreFiredRef = useRef(false);
  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(
    (e: ReactUIEvent<HTMLDivElement>) => {
      if (!onLoadMore) {
        return;
      }
      const el = e.currentTarget;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance <= loadMoreThresholdPx) {
        if (loadMoreFiredRef.current) {
          return;
        }
        loadMoreFiredRef.current = true;
        if (loadMoreTimerRef.current !== null) {
          clearTimeout(loadMoreTimerRef.current);
        }
        loadMoreTimerRef.current = setTimeout(() => {
          onLoadMore();
          loadMoreTimerRef.current = setTimeout(() => {
            loadMoreFiredRef.current = false;
          }, LOAD_MORE_DEBOUNCE_MS);
        }, LOAD_MORE_DEBOUNCE_MS);
      } else {
        loadMoreFiredRef.current = false;
      }
    },
    [onLoadMore, loadMoreThresholdPx],
  );

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current !== null) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const gridTemplate = useMemo(
    () =>
      columns
        .map((c) => {
          if (c.width === 'flex' || c.width === undefined) {
            return 'minmax(0, 1fr)';
          }
          return `${c.width}px`;
        })
        .join(' '),
    [columns],
  );

  const handleRowKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, index: number, row: T) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (onRowClick) {
          e.preventDefault();
          onRowClick(row);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = rowRefs.current.get(index + 1);
        if (next) {
          next.focus();
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = rowRefs.current.get(index - 1);
        if (prev) {
          prev.focus();
        }
      }
    },
    [onRowClick],
  );

  const rootCls = [
    'aegis-event-table',
    className ?? '',
    onRowClick ? 'aegis-event-table--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scrollStyle: CSSProperties = {
    maxHeight: `${estimatedRowHeight * maxVisibleRows}px`,
  };

  const headerCells = table.getHeaderGroups()[0]?.headers ?? [];

  const showEmpty = !loading && rows.length === 0;

  return (
    <div className={rootCls} role="grid">
      <div
        className="aegis-event-table__header"
        style={{ gridTemplateColumns: gridTemplate }}
        role="row"
      >
        {headerCells.map((header, i) => {
          const col = columns[i];
          const align = col.align ?? 'left';
          return (
            <div
              key={header.id}
              role="columnheader"
              className={`aegis-event-table__th aegis-event-table__th--${align}`}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        className="aegis-event-table__scroll"
        style={scrollStyle}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="aegis-event-table__skeleton-list">
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <div
                key={i}
                className="aegis-event-table__row aegis-event-table__row--skeleton"
                style={{
                  height: `${estimatedRowHeight}px`,
                  gridTemplateColumns: gridTemplate,
                }}
              >
                {columns.map((c) => (
                  <div key={c.key} className="aegis-event-table__td">
                    <span className="aegis-event-table__skeleton" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="aegis-event-table__empty">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div
            className="aegis-event-table__virtual"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const original = row.original;
              const key = rowKey(original);
              const isSelected = selectedKey === key;
              const rowCls = [
                'aegis-event-table__row',
                isSelected ? 'aegis-event-table__row--selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={key}
                  ref={(el) => {
                    if (el) {
                      rowRefs.current.set(vi.index, el);
                    } else {
                      rowRefs.current.delete(vi.index);
                    }
                  }}
                  role="row"
                  tabIndex={0}
                  className={rowCls}
                  style={{
                    transform: `translateY(${vi.start}px)`,
                    height: `${vi.size}px`,
                    gridTemplateColumns: gridTemplate,
                  }}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(original);
                        }
                      : undefined
                  }
                  onKeyDown={(e) => {
                    handleRowKeyDown(e, vi.index, original);
                  }}
                >
                  {row.getVisibleCells().map((cell, i) => {
                    const col = columns[i];
                    const align = col.align ?? 'left';
                    const truncate = col.truncate !== false;
                    const cellCls = [
                      'aegis-event-table__td',
                      `aegis-event-table__td--${align}`,
                      truncate ? 'aegis-event-table__td--truncate' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div key={cell.id} role="gridcell" className={cellCls}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventTable;
