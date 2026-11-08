import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { readStorage, writeStorage } from '../../lib/storage';

const DEFAULT_MIN_WIDTH = 60;
const AUTO_COLUMN_MIN_WIDTH = 120;
const KEYBOARD_STEP = 16;
const HEADER_CELLS = 'thead th[data-column-key]';

export interface ColumnWidthSpec {
  key: string;
  /** Initial width. Number → px, string → as-is (e.g. '20%'). */
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
}

interface UseColumnWidthsOptions {
  columns: ColumnWidthSpec[];
  /** Persists resized widths in localStorage under `aegis-data-table:<key>`. */
  persistKey?: string;
  /** Px taken by the fixed columns before the data columns. */
  leadWidth: number;
  /** Px taken by the fixed columns after the data columns. */
  trailWidth: number;
  /**
   * The table; its data columns' `<col>` and header `<th>` elements carry
   * `data-column-key`, and the filler's `<col>` carries
   * `data-column-filler`.
   */
  tableRef: RefObject<HTMLTableElement>;
}

interface ColumnWidths {
  /** CSS width of each column's `<col>`, in column order. */
  widths: Array<string | undefined>;
  /** True when any column has a width, so the table lays out fixed. */
  sized: boolean;
  /**
   * A floor under the table's width: the sum of its columns once a user
   * has resized them, otherwise one that keeps width-less columns from
   * collapsing.
   */
  tableStyle: CSSProperties | undefined;
  /**
   * Style of an empty column after the data columns, or undefined when no
   * column is resizable and the table needs none. Once every column has a
   * resized width it takes whatever width they leave, so they keep exactly
   * those widths and the table still fills its container; before that it
   * takes none.
   */
  fillerStyle: CSSProperties | undefined;
  /** Props of the resize handle of a resizable column's header. */
  handleProps: (column: ColumnWidthSpec) => HTMLAttributes<HTMLElement>;
}

type Widths = Record<string, number>;

function storageKey(persistKey: string): string {
  return `aegis-data-table:${persistKey}`;
}

function readPersisted(persistKey: string): Widths {
  const raw = readStorage(storageKey(persistKey));
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Widths;
    }
    return {};
  } catch {
    return {};
  }
}

function px(w: number): string {
  return `${w.toString()}px`;
}

function toCssWidth(w: number | string | undefined): string | undefined {
  if (w === undefined) {
    return undefined;
  }
  return typeof w === 'number' ? px(w) : w;
}

/** The narrowest a column renders or resizes to. */
function columnMin(column: ColumnWidthSpec): number {
  return column.minWidth ?? (column.resizable ? DEFAULT_MIN_WIDTH : 0);
}

function clampWidth(column: ColumnWidthSpec, w: number): number {
  return Math.min(Math.max(w, columnMin(column)), column.maxWidth ?? Infinity);
}

function headerCells(table: HTMLTableElement): HTMLTableCellElement[] {
  return Array.from(table.querySelectorAll<HTMLTableCellElement>(HEADER_CELLS));
}

/** Rendered width of each data column, to the nearest pixel. */
function renderedWidths(table: HTMLTableElement): Widths {
  const widths: Widths = {};
  headerCells(table).forEach((cell) => {
    const key = cell.dataset.columnKey;
    if (key !== undefined) {
      widths[key] = Math.round(cell.getBoundingClientRect().width);
    }
  });
  return widths;
}

/**
 * Whole-pixel widths that keep each column edge where the table renders
 * it, with the lead and trail columns back at their own widths (a table
 * wider than its columns stretches those too) and each column within its
 * own bounds. Edges are rounded rather than widths, and the table's right
 * edge rounds down, so the columns never add up to more than the table
 * they fill.
 */
function frozenWidths(
  table: HTMLTableElement,
  columns: ColumnWidthSpec[],
  leadWidth: number,
  trailWidth: number,
): Widths {
  const cells = headerCells(table);
  const rect = table.getBoundingClientRect();
  const widths: Widths = {};
  let edge = leadWidth;
  cells.forEach((cell, i) => {
    const right = Math.round(cell.getBoundingClientRect().right - rect.left);
    const next =
      i === cells.length - 1
        ? Math.min(right, Math.floor(rect.width) - trailWidth)
        : right;
    const column = columns.find((c) => c.key === cell.dataset.columnKey);
    if (column) {
      widths[column.key] = clampWidth(column, next - edge);
    }
    edge = next;
  });
  return widths;
}

function sameWidths(a: Widths, b: Widths): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}

/**
 * Column widths of a DataTable: the declared widths, the widths a user
 * resized (persisted when `persistKey` is set) and the handles that resize
 * them. A column without a width that declares a minimum is laid out at
 * that minimum, so it never renders narrower; columns without either take
 * the slack. A resize first fixes every column at its rendered width and
 * hands the table's spare width to the filler column, so a step or a drag
 * moves the edge by exactly the distance asked for. A drag writes widths
 * straight to the `<col>`s and only commits them to state and storage when
 * the pointer is released, so the rows do not re-render while the pointer
 * moves.
 */
export function useColumnWidths({
  columns,
  persistKey,
  leadWidth,
  trailWidth,
  tableRef,
}: UseColumnWidthsOptions): ColumnWidths {
  const [overrides, setOverrides] = useState<Widths>(() =>
    persistKey ? readPersisted(persistKey) : {},
  );
  const [rendered, setRendered] = useState<Widths>({});
  const stopDragRef = useRef<(() => void) | null>(null);
  const resizable = columns.some((c) => c.resizable === true);

  useEffect(() => {
    const stopDrag = stopDragRef;
    return () => {
      stopDrag.current?.();
    };
  }, []);

  // Another tab resized the same table.
  useIsomorphicLayoutEffect(() => {
    if (!persistKey) {
      return undefined;
    }
    const onStorage = (e: StorageEvent): void => {
      if (e.key === storageKey(persistKey)) {
        setOverrides(readPersisted(persistKey));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [persistKey]);

  const measure = useCallback(() => {
    const table = tableRef.current;
    if (!table) {
      return;
    }
    const next = renderedWidths(table);
    setRendered((prev) => (sameWidths(prev, next) ? prev : next));
  }, [tableRef]);

  // The handles report their column's width before anyone resizes it.
  useIsomorphicLayoutEffect(() => {
    if (resizable) {
      measure();
    }
  });

  useIsomorphicLayoutEffect(() => {
    const table = tableRef.current;
    if (!resizable || !table || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => {
      observer.disconnect();
    };
  }, [resizable, tableRef, measure]);

  const commit = useCallback(
    (next: Widths) => {
      setOverrides((prev) => ({ ...prev, ...next }));
      if (persistKey) {
        writeStorage(
          storageKey(persistKey),
          JSON.stringify({ ...readPersisted(persistKey), ...next }),
        );
      }
    },
    [persistKey],
  );

  const frozen = columns.length > 0 && columns.every((c) => c.key in overrides);
  const sized = columns.some(
    (c) => c.width !== undefined || c.resizable === true || c.key in overrides,
  );

  const widths = useMemo(
    () =>
      columns.map((c) =>
        c.key in overrides
          ? px(overrides[c.key])
          : toCssWidth(c.width ?? c.minWidth),
      ),
    [columns, overrides],
  );

  const totalWidth = useCallback(
    (w: Widths): number =>
      columns.reduce((sum, c) => sum + w[c.key], leadWidth + trailWidth),
    [columns, leadWidth, trailWidth],
  );

  const tableStyle = useMemo((): CSSProperties | undefined => {
    if (!sized) {
      return undefined;
    }
    if (frozen) {
      return { minWidth: px(totalWidth(overrides)) };
    }
    const minWidth = columns.reduce((sum, c) => {
      const w =
        c.key in overrides
          ? overrides[c.key]
          : typeof c.width === 'number'
            ? c.width
            : undefined;
      return sum + (w ?? c.minWidth ?? AUTO_COLUMN_MIN_WIDTH);
    }, leadWidth + trailWidth);
    return { minWidth: px(minWidth) };
  }, [sized, frozen, totalWidth, overrides, columns, leadWidth, trailWidth]);

  const fillerStyle = useMemo(
    (): CSSProperties | undefined =>
      resizable ? { width: frozen ? undefined : 0 } : undefined,
    [resizable, frozen],
  );

  const handleProps = useCallback(
    (column: ColumnWidthSpec): HTMLAttributes<HTMLElement> => {
      const min = columnMin(column);
      const max = column.maxWidth ?? Infinity;
      const clamp = (w: number): number => clampWidth(column, w);
      const startWidths = (table: HTMLTableElement): Widths =>
        frozen
          ? overrides
          : frozenWidths(table, columns, leadWidth, trailWidth);

      const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const table = tableRef.current;
        if (!table) {
          return;
        }
        stopDragRef.current?.();
        const handle = event.currentTarget;
        const start = startWidths(table);
        const startX = event.clientX;
        const startWidth = start[column.key];
        const cols = Array.from(
          table.querySelectorAll<HTMLTableColElement>('col[data-column-key]'),
        );
        const col = cols.find((c) => c.dataset.columnKey === column.key);
        const fillerCol = table.querySelector<HTMLTableColElement>(
          'col[data-column-filler]',
        );
        let width = startWidth;
        let moved = false;

        const onMove = (e: PointerEvent): void => {
          if (!moved) {
            moved = true;
            cols.forEach((c) => {
              const key = c.dataset.columnKey;
              if (key !== undefined && key in start) {
                c.style.width = px(start[key]);
              }
            });
            if (fillerCol) {
              fillerCol.style.width = '';
            }
          }
          width = clamp(Math.round(startWidth + e.clientX - startX));
          if (col) {
            col.style.width = px(width);
          }
          table.style.minWidth = px(
            totalWidth({ ...start, [column.key]: width }),
          );
          handle.setAttribute('aria-valuenow', width.toString());
        };
        const stop = (): void => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onEnd);
          window.removeEventListener('pointercancel', onEnd);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          stopDragRef.current = null;
        };
        const onEnd = (): void => {
          stop();
          if (moved) {
            commit({ ...start, [column.key]: width });
          }
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
        stopDragRef.current = stop;
      };

      const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
        const table = tableRef.current;
        if (!table) {
          return;
        }
        let step: ((current: number) => number) | undefined;
        if (event.key === 'ArrowLeft') {
          step = (current) => current - KEYBOARD_STEP;
        } else if (event.key === 'ArrowRight') {
          step = (current) => current + KEYBOARD_STEP;
        } else if (event.key === 'Home') {
          step = () => min;
        } else if (event.key === 'End' && Number.isFinite(max)) {
          step = () => max;
        }
        if (step) {
          event.preventDefault();
          const start = startWidths(table);
          commit({ ...start, [column.key]: clamp(step(start[column.key])) });
        }
      };

      return {
        role: 'separator',
        tabIndex: 0,
        'aria-orientation': 'vertical',
        'aria-valuemin': min,
        'aria-valuemax': Number.isFinite(max) ? max : undefined,
        'aria-valuenow': rendered[column.key],
        onPointerDown,
        onKeyDown,
      };
    },
    [
      frozen,
      overrides,
      rendered,
      columns,
      tableRef,
      totalWidth,
      commit,
      leadWidth,
      trailWidth,
    ],
  );

  return { widths, sized, tableStyle, fillerStyle, handleProps };
}
