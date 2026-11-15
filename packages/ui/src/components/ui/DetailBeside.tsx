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
  scrollingAncestorOf,
  viewBoundsOf,
} from '../../lib/scrollView';
import './DetailBeside.css';
import { Pane, type PaneProps } from './PaneLayout';
import {
  type SelectedRowDetail,
  SelectedRowDetailContext,
} from './selectedRowDetail';

interface DetailBesideBaseProps {
  /**
   * The selected item's detail: one element, such as a `Panel` titled with
   * the item's name. Render it anew from the host's data whenever that
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
}

/** The column form: the list and the detail in a grid of their own. */
export interface DetailBesideColumnsProps extends DetailBesideBaseProps {
  layout?: 'columns';
  /**
   * `grid-template-columns` of the list and the detail above 768 px, e.g.
   * `'3fr 2fr'`. The detail is never taller than the view, so a long Panel
   * scrolls its body.
   */
  columns: string;
  /** The element that scrolls the page; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

/** A `Pane` of the pane form, as `Pane` takes it but for its content. */
export type DetailBesidePane = Omit<PaneProps, 'children'>;

/**
 * The pane form: the list and the detail as two `Pane`s, set directly in a
 * `PaneLayout` after any panes that come before the list.
 */
export interface DetailBesidePanesProps extends DetailBesideBaseProps {
  layout: 'panes';
  /** The list's pane; `size` defaults to `fill`. */
  listPane?: DetailBesidePane;
  /** The detail's pane above 768 px; `size` defaults to `lg`. */
  detailPane?: DetailBesidePane;
}

export type DetailBesideProps =
  | DetailBesideColumnsProps
  | DetailBesidePanesProps;

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
 *
 * With `layout="panes"` the list and the detail are two `Pane`s of the
 * `PaneLayout` it is set in, divided by a hairline, and each scrolls on its
 * own. Above 768 px the detail stands at its pane's top, and a reveal
 * scrolls the list's pane to the row and the detail's pane to its top. At
 * 768 px and below there is only the list's pane, which draws the detail
 * right after the selected row as the column form does, and a reveal
 * scrolls the nearest scroller around it, the stacked `PaneLayout` in a
 * bleed page. The list is `aria-busy` while a selected row is on its way.
 */
export function DetailBeside(props: DetailBesideProps) {
  const { detail, children, revealKey } = props;
  const panes = props.layout === 'panes';
  const scrollContainer = panes ? null : (props.scrollContainer ?? null);
  const narrow = useMediaQuery(NARROW_QUERY);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  /** Above 768 px in the pane form, the detail's box, whose parent is its pane. */
  const detailPaneRef = useRef<HTMLDivElement>(null);
  /** The scroller of the last reveal, whose scroll by the viewer ends following. */
  const scrollerRef = useRef<HTMLElement | null>(null);
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
      const scroller =
        panes && listRef.current !== null
          ? scrollingAncestorOf(listRef.current)
          : null;
      if (scroller === null) {
        box.style.removeProperty('--detail-beside-view-height');
        box.style.removeProperty('--detail-beside-sticky-top');
      } else {
        box.style.setProperty(
          '--detail-beside-view-height',
          `${String(scroller.clientHeight)}px`,
        );
        box.style.setProperty('--detail-beside-sticky-top', '0px');
      }
    } else {
      const top = spacer.getBoundingClientRect().top;
      spacer.style.height = `${String(Math.max(rowBox.top - top, 0))}px`;
    }
  }, [panes]);

  /** Places the row and scrolls as little as it takes to show it and its detail whole. */
  const reveal = useCallback(() => {
    place();
    const row = rowRef.current;
    const list = listRef.current;
    const box = detailRef.current;
    // The detail's own pane, above 768 px, leaves only the row to show.
    const besidePane = detailPaneRef.current !== null;
    if (row === null || list === null || (box === null && !besidePane)) {
      return;
    }
    const container = panes ? scrollingAncestorOf(list) : scrollContainer;
    const rowBox = row.getBoundingClientRect();
    const spacer = spacerRef.current;
    const distance = revealDistance(
      rowBox,
      spacer === null ? rowBox.bottom : spacer.getBoundingClientRect().top,
      box === null ? 0 : box.getBoundingClientRect().height,
      box === null ? 0 : parseFloat(getComputedStyle(box).scrollMarginTop),
      viewBoundsOf(container),
    );
    const scroller = scrollerOf(container);
    if (Math.abs(distance) >= 1) {
      scroller.scrollBy({ top: distance, behavior: 'instant' });
    }
    scrollerRef.current = scroller;
    revealedAtRef.current = scroller.scrollTop;
  }, [panes, place, scrollContainer]);

  // A list places its row while React attaches refs, before the detail's
  // own ref is in and before the re-renders its layout effects ask for,
  // so the reveal waits for the commit to finish.
  const revealSoon = useCallback(() => {
    revealedKeyRef.current = revealKeyRef.current;
    detailPaneRef.current?.parentElement?.scrollTo({
      top: 0,
      behavior: 'instant',
    });
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
    const scrolled = (): void => {
      const scroller = scrollerRef.current;
      if (
        scroller !== null &&
        Math.abs(scroller.scrollTop - revealedAtRef.current) >= 1
      ) {
        followRef.current = false;
      }
    };
    // The pane form's scroller is whichever holds the list, found at each
    // reveal; scroll events do not bubble, but they pass the document.
    const target = panes ? document : (scrollContainer ?? window);
    const options = { capture: panes, passive: true };
    target.addEventListener('scroll', scrolled, options);
    return () => {
      target.removeEventListener('scroll', scrolled, options);
    };
  }, [panes, scrollContainer]);

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

  if (props.layout === 'panes') {
    return (
      <SelectedRowDetailContext.Provider value={slot}>
        <DetailContext.Provider value={isolated}>
          <Pane size="fill" {...props.listPane}>
            <div
              ref={listRef}
              className="aegis-detail-beside__list"
              aria-busy={busy || undefined}
            >
              {children}
            </div>
          </Pane>
          {!narrow && (
            <Pane size="lg" {...props.detailPane}>
              <div ref={detailPaneRef}>{isolated}</div>
            </Pane>
          )}
        </DetailContext.Provider>
      </SelectedRowDetailContext.Provider>
    );
  }

  const cls = ['aegis-detail-beside', props.className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <SelectedRowDetailContext.Provider value={slot}>
      <DetailContext.Provider value={isolated}>
        <div
          className={cls}
          style={
            {
              '--aegis-detail-beside-columns': props.columns,
            } as CSSProperties
          }
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
