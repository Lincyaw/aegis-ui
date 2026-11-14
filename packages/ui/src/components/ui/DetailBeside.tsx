import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
   * scrolls its body. Render it anew from the host's data whenever that
   * data changes: that render tells DetailBeside the change was new data,
   * so the page stays where it is. A detail that fetches its own data and
   * redraws without this host rendering leaves the page following the row,
   * and its next change of size scrolls the page.
   */
  detail: ReactNode;
  /**
   * The list: a `TraceTree`, `FileTree`, `DataTable`, `TreeTable` or
   * `ServiceMap`, in a Panel say. The detail follows the row it draws
   * selected. Like `detail`, render it anew from the host's data whenever
   * that data changes, so the page stays where it is on new data; a list
   * that fetches its own data and redraws without this host rendering
   * leaves the page following the row, and its next change of size scrolls
   * the page.
   */
  children: ReactNode;
  /**
   * The selection as the page's address names it, or null where the
   * address names none and the list shows a default. It changes only by
   * the viewer's doing: a click, a key, a link, back or forward. The page
   * scrolls to the selected row when this changes, and on the first
   * placement after mount; a row that comes into place for new data, such
   * as a default the data moved, is only levelled with.
   */
  revealKey: string | null;
  /** The element that scrolls the page; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

const NARROW_QUERY = '(max-width: 768px)';

/**
 * The detail as the inline slot draws it. It is kept out of the context the
 * lists read, so a new detail re-renders the slot and not the list.
 */
const DetailContext = createContext<ReactNode>(null);

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

/** The detail right after the selected row, at 768 px and below. */
function InlineDetail({ boxRef }: { boxRef: RefObject<HTMLDivElement> }) {
  const detail = useContext(DetailContext);
  return (
    <div ref={boxRef} className="aegis-detail-beside__inline" role="group">
      {detail}
    </div>
  );
}

/**
 * A tree, table or map with the selected item's detail beside it. Above
 * 768 px the detail stands in a column on the right, level with the
 * selected row: when the row is too low for it, its bottom meets the
 * view's bottom, and while the page scrolls it stays in the view below
 * the header; while the list draws no row selected, it stands at the
 * column's top. At 768 px and below the list draws the detail right after
 * the selected row, the rows that follow under it; a map draws it over
 * the map, under the node. When the page opens with a selection,
 * `revealKey` changes or the viewer clicks the selected row, the page
 * scrolls at once, as little as it takes to show the row and the detail
 * whole, and again whenever the list or the detail changes size, until the
 * viewer scrolls or the host renders a new list or detail. Any other
 * placement, such as new data moving the selection or the rows, levels
 * the detail with its row by the same rule and leaves the page where it
 * is; the browser's scroll anchoring can still move it when rows arrive
 * above the view, unless the host sets `overflow-anchor: none` on its
 * scroller. The wrapper is `aria-busy` while a selected row it reveals is
 * still on its way.
 */
export function DetailBeside({
  columns,
  detail,
  children,
  revealKey,
  scrollContainer = null,
  className,
}: DetailBesideProps) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLElement | null>(null);
  /** Whether the page is still where the last reveal left it. */
  const followRef = useRef(false);
  const revealedAtRef = useRef(0);
  /** The latest render's revealKey, and the last reveal's: undefined before the first. */
  const revealKeyRef = useRef(revealKey);
  const revealedKeyRef = useRef<string | null | undefined>(undefined);
  /** The latest render's list and detail, which change when the host renders them anew. */
  const shownRef = useRef({ children, detail });

  /**
   * Sets the detail level with the row: above 768 px through the spacer's
   * height, at and below by telling the inline detail how tall the row is.
   * While the list draws no row selected, such as when a filter or a closed
   * parent hides it, the detail stands at the top of its column.
   */
  const place = useCallback(() => {
    const row = rowRef.current;
    const box = detailRef.current;
    const spacer = spacerRef.current;
    if (row === null) {
      spacer?.style.removeProperty('height');
      return;
    }
    if (box === null) {
      return;
    }
    const rowBox = row.getBoundingClientRect();
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

  /** Places the row and scrolls as little as it takes to show it and its detail whole. */
  const reveal = useCallback(() => {
    place();
    const row = rowRef.current;
    const box = detailRef.current;
    if (row === null || box === null) {
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
    const scroller = scrollerOf(scrollContainer);
    if (Math.abs(distance) >= 1) {
      scroller.scrollBy({ top: distance, behavior: 'instant' });
    }
    revealedAtRef.current = scroller.scrollTop;
  }, [place, scrollContainer]);

  // A list places its row while React attaches refs, before the detail's
  // own ref is in and before the re-renders its layout effects ask for,
  // so the reveal waits for the commit to finish.
  const revealSoon = useCallback(() => {
    revealedKeyRef.current = revealKeyRef.current;
    followRef.current = true;
    setBusy(true);
    queueMicrotask(() => {
      reveal();
      setBusy(false);
    });
  }, [reveal]);

  // A row placed while a reveal is due is revealed; any other is levelled
  // with, and a new one ends following.
  const placeRow = useCallback(
    (row: HTMLElement | null) => {
      const fresh = row !== rowRef.current;
      rowRef.current = row;
      if (row === null) {
        followRef.current = false;
        setBusy(false);
        place();
      } else if (revealedKeyRef.current !== revealKeyRef.current) {
        revealSoon();
      } else {
        if (fresh) {
          followRef.current = false;
        }
        place();
      }
    },
    [place, revealSoon],
  );

  const awaitRow = useCallback(() => {
    setBusy(true);
  }, []);

  // Runs after the lists have placed their rows in this commit, so a new
  // revealKey reveals the row it selects. A render by the host without one
  // ends following.
  useIsomorphicLayoutEffect(() => {
    const rendered =
      shownRef.current.children !== children ||
      shownRef.current.detail !== detail;
    shownRef.current = { children, detail };
    revealKeyRef.current = revealKey;
    if (revealedKeyRef.current !== revealKey && rowRef.current !== null) {
      revealSoon();
    } else {
      if (rendered) {
        followRef.current = false;
      }
      place();
    }
  });

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      if (followRef.current) {
        reveal();
      } else {
        place();
      }
    });
    // At 768 px and below the detail lies inside the list.
    for (const box of narrow ? [list] : [list, detailRef.current]) {
      if (box !== null) {
        observer.observe(box);
      }
    }
    const activate = (event: MouseEvent): void => {
      if (
        event.target instanceof Node &&
        rowRef.current?.contains(event.target)
      ) {
        revealSoon();
      }
    };
    list.addEventListener('click', activate);
    return () => {
      observer.disconnect();
      list.removeEventListener('click', activate);
    };
  }, [narrow, place, reveal, revealSoon]);

  useEffect(() => {
    const scroller = scrollerOf(scrollContainer);
    const target = scrollContainer ?? window;
    const scrolled = (): void => {
      if (Math.abs(scroller.scrollTop - revealedAtRef.current) >= 1) {
        followRef.current = false;
      }
    };
    target.addEventListener('scroll', scrolled, { passive: true });
    return () => {
      target.removeEventListener('scroll', scrolled);
    };
  }, [scrollContainer]);

  const inline = useMemo(
    () => (narrow ? <InlineDetail boxRef={detailRef} /> : null),
    [narrow],
  );
  const slot = useMemo(
    (): SelectedRowDetail => ({ placeRow, awaitRow, inline }),
    [placeRow, awaitRow, inline],
  );
  const isolated = (
    <SelectedRowDetailContext.Provider value={null}>
      {detail}
    </SelectedRowDetailContext.Provider>
  );

  const cls = ['aegis-detail-beside', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <SelectedRowDetailContext.Provider value={slot}>
      <DetailContext.Provider value={isolated}>
        <div
          className={cls}
          style={{ '--aegis-detail-beside-columns': columns } as CSSProperties}
          aria-busy={busy || undefined}
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
      </DetailContext.Provider>
    </SelectedRowDetailContext.Provider>
  );
}
