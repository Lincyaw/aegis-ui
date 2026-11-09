import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  type ViewBounds,
  scrollerOf,
  viewBoundsOf,
} from '../../lib/scrollView';
import './DetailBeside.css';
import {
  type SelectedRowDetail,
  SelectedRowDetailContext,
} from './selectedRowDetail';

export interface DetailBesideProps {
  /**
   * `grid-template-columns` of the list and the detail above 768 px, e.g.
   * `'3fr 2fr'`.
   */
  columns: string;
  /**
   * The selected item's detail: one element, such as a `Panel` titled with
   * the item's name. It is never taller than the view, so a long Panel
   * scrolls its body.
   */
  detail: ReactNode;
  /**
   * The list: a `TraceTree`, `FileTree`, `DataTable` or `ServiceMap`, in a
   * Panel say. The detail follows the row it draws selected.
   */
  children: ReactNode;
  /** The element that scrolls the page; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

const NARROW_QUERY = '(max-width: 768px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * How far to scroll so the row is in the view, clear of the `inset` at the
 * view's top, and the detail, whose top can rise no higher than `ceiling`,
 * fits above the view's bottom.
 */
function revealDistance(
  row: DOMRect,
  ceiling: number,
  height: number,
  inset: number,
  view: ViewBounds,
): number {
  const top = view.top + inset;
  const toRow =
    row.top < top ? row.top - top : Math.max(row.bottom - view.bottom, 0);
  return Math.max(toRow, ceiling + height - view.bottom);
}

/**
 * A tree, table or map with the selected item's detail beside it. Above
 * 768 px the detail stands in a column on the right, level with the
 * selected row: when the row is too low for it, its bottom meets the
 * view's bottom, and while the page scrolls it stays in the view below
 * the header. At 768 px and below the list draws the detail right after
 * the selected row, the rows that follow under it; a map draws it over
 * the map, under the node. When the selection changes, or the page opens
 * with one, the page scrolls as little as it takes to show the row and
 * the detail whole.
 */
export function DetailBeside({
  columns,
  detail,
  children,
  scrollContainer = null,
  className,
}: DetailBesideProps) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const listRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLElement | null>(null);
  const revealedRef = useRef<HTMLElement | null>(null);

  /** The spacer that sets the detail level with the row above 768 px, or the room the row leaves it at and below. */
  const place = useCallback(() => {
    const row = rowRef.current;
    const box = detailRef.current;
    if (row === null || box === null) {
      return;
    }
    const rowBox = row.getBoundingClientRect();
    const spacer = spacerRef.current;
    if (spacer === null) {
      box.style.setProperty(
        '--aegis-detail-beside-row-height',
        `${String(rowBox.height)}px`,
      );
    } else {
      const top = spacer.getBoundingClientRect().top;
      spacer.style.height = `${String(Math.max(rowBox.top - top, 0))}px`;
    }
  }, []);

  /** Places a row not yet shown and scrolls it and its detail into view. */
  const reveal = useCallback(() => {
    place();
    const row = rowRef.current;
    const box = detailRef.current;
    if (row === null || box === null || row === revealedRef.current) {
      return;
    }
    const rowBox = row.getBoundingClientRect();
    const spacer = spacerRef.current;
    const distance = revealDistance(
      rowBox,
      spacer === null ? rowBox.bottom : spacer.getBoundingClientRect().top,
      box.getBoundingClientRect().height,
      parseFloat(getComputedStyle(box).scrollMarginTop),
      viewBoundsOf(scrollContainer),
    );
    if (Math.abs(distance) >= 1) {
      scrollerOf(scrollContainer).scrollBy({
        top: distance,
        behavior:
          revealedRef.current === null ||
          window.matchMedia(REDUCED_MOTION).matches
            ? 'instant'
            : 'smooth',
      });
    }
    revealedRef.current = row;
  }, [place, scrollContainer]);

  // A list places its row while React attaches refs, before the detail's
  // own ref is in and before the re-renders its layout effects ask for,
  // so the reveal waits for the commit to finish.
  const placeRow = useCallback(
    (row: HTMLElement | null) => {
      rowRef.current = row;
      queueMicrotask(reveal);
    },
    [reveal],
  );

  useIsomorphicLayoutEffect(place);

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return undefined;
    }
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => {
      observer.disconnect();
    };
  }, [place]);

  const isolated = useMemo(
    () => (
      <SelectedRowDetailContext.Provider value={null}>
        {detail}
      </SelectedRowDetailContext.Provider>
    ),
    [detail],
  );
  const slot = useMemo(
    (): SelectedRowDetail => ({
      placeRow,
      inline: narrow ? (
        <div
          ref={detailRef}
          className="aegis-detail-beside__inline"
          role="group"
        >
          {isolated}
        </div>
      ) : null,
    }),
    [placeRow, narrow, isolated],
  );

  const cls = ['aegis-detail-beside', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <SelectedRowDetailContext.Provider value={slot}>
      <div
        className={cls}
        style={{ '--aegis-detail-beside-columns': columns } as CSSProperties}
      >
        <div ref={listRef} className="aegis-detail-beside__list">
          {children}
        </div>
        {!narrow && (
          <div className="aegis-detail-beside__side">
            <div ref={spacerRef} />
            <div ref={detailRef} className="aegis-detail-beside__detail">
              {isolated}
            </div>
          </div>
        )}
      </div>
    </SelectedRowDetailContext.Provider>
  );
}
