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
  useState,
} from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import { useDevelopAfterLoad } from '../../hooks/useDevelopAfterLoad';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useStrings } from '../../locale';
import { EmptyState } from './EmptyState';
import './EventTable.css';
import { Skeleton } from './Skeleton';

export interface EventTableColumn<T> {
  key: string;
  header: ReactNode;
  /**
   * Column width in px, or 'flex' (the default) to share the remaining
   * space, never below 120 px. When the columns don't fit, the table
   * scrolls sideways, header and rows together.
   */
  width?: number | 'flex';
  /** Align cell content. Default 'left'. */
  align?: 'left' | 'right' | 'center';
  /**
   * Number column: header and cells right-aligned, figures in
   * `--font-numeric` with tabular widths so digits and decimal points line
   * up. Overrides `align`.
   */
  numeric?: boolean;
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
  /**
   * Makes rows clickable: focusable, a muted hover background, Enter or
   * Space on a focused row and the arrow keys between rows. Without it
   * rows are plain, and links inside cells keep their own behaviour.
   */
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
const FLEX_COLUMN_MIN_WIDTH = 120;

function columnAlign<T>(col: EventTableColumn<T>): 'left' | 'right' | 'center' {
  return col.numeric ? 'right' : (col.align ?? 'left');
}

export function EventTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectedKey,
  loading = false,
  emptyTitle,
  emptyDescription,
  estimatedRowHeight = DEFAULT_ROW_HEIGHT,
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
  onLoadMore,
  loadMoreThresholdPx = DEFAULT_LOAD_MORE_THRESHOLD,
  className,
}: EventTableProps<T>) {
  const strings = useStrings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const [headerHeight, setHeaderHeight] = useState(0);
  const clickable = onRowClick !== undefined;

  // The header scrolls with the rows, so both share the scrollbar's gutter
  // and their columns line up; the rows start below it.
  useIsomorphicLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return undefined;
    }
    const measure = (): void => {
      setHeaderHeight(header.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => {
      observer.disconnect();
    };
  }, []);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: OVERSCAN,
    scrollMargin: headerHeight,
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
        .map((c) =>
          c.width === 'flex' || c.width === undefined
            ? 'minmax(0, 1fr)'
            : `${c.width.toString()}px`,
        )
        .join(' '),
    [columns],
  );

  const contentStyle = useMemo(
    (): CSSProperties => ({
      minWidth: `${columns
        .reduce(
          (sum, c) =>
            sum +
            (typeof c.width === 'number' ? c.width : FLEX_COLUMN_MIN_WIDTH),
          0,
        )
        .toString()}px`,
    }),
    [columns],
  );

  const handleRowKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, index: number, row: T) => {
      if (e.target !== e.currentTarget) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRowClick?.(row);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // Overscan keeps the neighbouring rows mounted.
        rowRefs.current.get(index + (e.key === 'ArrowDown' ? 1 : -1))?.focus();
      }
    },
    [onRowClick],
  );

  const rootCls = ['aegis-event-table', className ?? '']
    .filter(Boolean)
    .join(' ');

  const scrollStyle: CSSProperties = {
    maxHeight: `${(estimatedRowHeight * maxVisibleRows + headerHeight).toString()}px`,
    scrollPaddingTop: `${headerHeight.toString()}px`,
  };

  const showEmpty = !loading && data.length === 0;
  const develop = useDevelopAfterLoad(loading);
  const cellRole = clickable ? 'gridcell' : 'cell';

  return (
    <div
      className={rootCls}
      role={clickable ? 'grid' : 'table'}
      aria-rowcount={data.length + (showEmpty ? 2 : 1)}
      aria-busy={loading || undefined}
    >
      <div
        ref={scrollRef}
        className="aegis-event-table__scroll"
        style={scrollStyle}
        onScroll={handleScroll}
      >
        <div
          ref={headerRef}
          className="aegis-event-table__header"
          style={{ ...contentStyle, gridTemplateColumns: gridTemplate }}
          role="row"
          aria-rowindex={1}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              role="columnheader"
              className={`aegis-event-table__th aegis-event-table__th--${columnAlign(col)}`}
            >
              {col.header}
            </div>
          ))}
        </div>

        <div data-aegis-develop={develop || undefined} style={contentStyle}>
          {loading ? (
            <div
              className="aegis-event-table__skeleton-list"
              aria-hidden="true"
            >
              {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="aegis-event-table__row aegis-event-table__row--skeleton"
                  style={{
                    height: `${estimatedRowHeight.toString()}px`,
                    gridTemplateColumns: gridTemplate,
                  }}
                >
                  {columns.map((c) => (
                    <div key={c.key} className="aegis-event-table__td">
                      <Skeleton width="80%" height="var(--space-3)" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : showEmpty ? (
            <div
              className="aegis-event-table__empty"
              role="row"
              aria-rowindex={2}
            >
              <div role={cellRole} aria-colspan={columns.length}>
                <EmptyState
                  title={emptyTitle ?? strings.noEvents}
                  description={emptyDescription}
                />
              </div>
            </div>
          ) : (
            <div
              className="aegis-event-table__virtual"
              style={{
                height: `${virtualizer.getTotalSize().toString()}px`,
              }}
            >
              {virtualizer.getVirtualItems().map((vi) => {
                const row = data[vi.index];
                const key = rowKey(row);
                const rowCls = [
                  'aegis-event-table__row',
                  clickable ? 'aegis-event-table__row--clickable' : '',
                  selectedKey === key ? 'aegis-event-table__row--selected' : '',
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
                    aria-rowindex={vi.index + 2}
                    aria-selected={
                      clickable && selectedKey !== undefined
                        ? selectedKey === key
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                    className={rowCls}
                    style={{
                      transform: `translateY(${(vi.start - headerHeight).toString()}px)`,
                      height: `${vi.size.toString()}px`,
                      gridTemplateColumns: gridTemplate,
                    }}
                    onClick={
                      onRowClick
                        ? () => {
                            onRowClick(row);
                          }
                        : undefined
                    }
                    onKeyDown={
                      clickable
                        ? (e) => {
                            handleRowKeyDown(e, vi.index, row);
                          }
                        : undefined
                    }
                  >
                    {columns.map((col) => {
                      const truncate = col.truncate !== false;
                      const cellCls = [
                        'aegis-event-table__td',
                        `aegis-event-table__td--${columnAlign(col)}`,
                        col.numeric ? 'aegis-event-table__td--numeric' : '',
                        truncate ? 'aegis-event-table__td--truncate' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <div key={col.key} role={cellRole} className={cellCls}>
                          {col.render(row)}
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
    </div>
  );
}
