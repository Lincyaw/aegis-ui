import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useStrings } from '../../locale';
import './Workbench.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface WorkbenchTab {
  key: string;
  /** The record's name, the tab link's text. */
  name: string;
  /** Opens the tab. */
  href: string;
  /** Closes the tab. */
  closeHref: string;
  /** False for a preview tab, which the next opened record replaces. */
  pinned: boolean;
  active: boolean;
  /** Where a double-click on the tab goes, e.g. its pinned address. */
  pinHref?: string;
}

export interface WorkbenchProps {
  /** The list, e.g. a `DataTable` or `TraceTree` whose rows link to records. */
  children: ReactNode;
  /** The open records. With none, the list spans the full width. */
  tabs: readonly WorkbenchTab[];
  /** The active tab's detail; only it is rendered. */
  detail: ReactNode;
  /** The 返回列表 link that leads back to the list at 768 px or narrower. */
  backHref: string;
  /**
   * Where a double-click on a list link goes, given that link's `href`;
   * null leaves the double-click alone. E.g. a row's pinned address.
   */
  listPinHref?: (href: string) => string | null;
  /** Renders the links; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  /** The list's width beside the group: the `--pane-width-*` sizes. */
  listSize?: 'sm' | 'md' | 'lg';
  /** Names the list pane, making it a region. */
  listLabel?: string;
  /**
   * A pane before the list, e.g. an area tree that filters it. Above 768 px
   * it sits left of the list and scrolls itself; at 768 px or narrower it
   * stacks above the list in one scrolling column, which an active tab
   * moves off-canvas with the list.
   */
  leading?: ReactNode;
  /** The leading pane's width above 768 px: the `--pane-width-*` sizes. */
  leadingSize?: 'sm' | 'md' | 'lg';
  /** Names the leading pane, making it a region. */
  leadingLabel?: string;
  className?: string;
}

/** How long after a click the list keeps its clicked row in place. */
const SETTLE_MS = 1000;

/** The selected item a list draws, should the clicked element be redrawn. */
const SELECTED =
  '[aria-selected="true"], [aria-current="page"], [aria-current="true"]';

function CloseGlyph() {
  return (
    <svg
      className="aegis-workbench__close-glyph"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * A list beside an editor group, as in VS Code. Above 768 px it fills its
 * flex parent (a bleed `PageWrapper` under the page bar): the list and the
 * group each scroll inside themselves, opening or switching a tab leaves the
 * clicked row where it was, and each detail starts at its top. The group
 * heads its detail with a strip of tab links, each followed by its close
 * link; a preview tab's name is muted. With no tabs there is no group. At
 * 768 px or narrower an active tab's group covers the view below the header,
 * headed by a 返回列表 link, and the list moves off-canvas, still mounted.
 * There the list (after any `leading` pane) scrolls inside the workbench,
 * which fills a bleed page's height without growing it.
 */
export function Workbench({
  children,
  tabs,
  detail,
  backHref,
  listPinHref,
  linkComponent,
  listSize = 'md',
  listLabel,
  leading,
  leadingSize = 'sm',
  leadingLabel,
  className,
}: WorkbenchProps) {
  const strings = useStrings();
  const LinkImpl = linkComponent ?? DefaultLink;
  const listRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLSpanElement>(null);
  const clickedRef = useRef<{ element: Element; top: number } | null>(null);
  const [pinTo, setPinTo] = useState<string | null>(null);

  const open = tabs.length > 0;
  const activeTab = tabs.find((tab) => tab.active);
  const activeKey = activeTab?.key ?? null;

  // A link adapter takes no handlers, so the list's and the strip's clicks
  // are heard on their containers.
  const listPinHrefRef = useRef(listPinHref);
  listPinHrefRef.current = listPinHref;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return undefined;
    }
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const element =
        event.target.closest('a, [role="row"], [role="treeitem"], li, tr') ??
        event.target;
      clickedRef.current = {
        element,
        top: element.getBoundingClientRect().top,
      };
    };
    const onDoubleClick = (event: MouseEvent): void => {
      // The link itself, or the one in the row: a tree item or table row
      // may hold its link inside, around less than the whole row.
      const link =
        event.target instanceof Element
          ? (event.target.closest('a') ??
            event.target
              .closest('[role="treeitem"], [role="row"], li, tr')
              ?.querySelector('a'))
          : null;
      const href = link?.getAttribute('href');
      const to =
        href === null || href === undefined
          ? null
          : (listPinHrefRef.current?.(href) ?? null);
      if (to !== null) {
        setPinTo(to);
      }
    };
    list.addEventListener('click', onClick, true);
    list.addEventListener('dblclick', onDoubleClick);
    return () => {
      list.removeEventListener('click', onClick, true);
      list.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (strip === null) {
      return undefined;
    }
    const onDoubleClick = (event: MouseEvent): void => {
      const key =
        event.target instanceof Element
          ? event.target
              .closest<HTMLElement>('[data-workbench-tab]')
              ?.getAttribute('data-workbench-tab')
          : null;
      const to = tabsRef.current.find((tab) => tab.key === key)?.pinHref;
      if (to !== undefined) {
        setPinTo(to);
      }
    };
    strip.addEventListener('dblclick', onDoubleClick);
    return () => {
      strip.removeEventListener('dblclick', onDoubleClick);
    };
  }, [open]);

  // Navigates by clicking a hidden link, so the host's router handles it.
  useIsomorphicLayoutEffect(() => {
    if (pinTo === null) {
      return;
    }
    pinRef.current?.querySelector('a')?.click();
    setPinTo(null);
  }, [pinTo]);

  // The group opening narrows the list, which rewraps its rows, and the
  // list may reflow again as it settles (column widths, fonts, a reveal of
  // its own): the clicked row is put back where it was at each change for a
  // short while, until the reader scrolls.
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    const clicked = clickedRef.current;
    if (list === null || clicked === null) {
      return undefined;
    }
    clickedRef.current = null;
    const level = (): void => {
      const element = clicked.element.isConnected
        ? clicked.element
        : list.querySelector(SELECTED);
      if (element === null) {
        return;
      }
      const delta = element.getBoundingClientRect().top - clicked.top;
      if (Math.abs(delta) >= 1) {
        list.scrollTop += delta;
      }
    };
    level();
    const observer = new ResizeObserver(level);
    observer.observe(list);
    for (const child of Array.from(list.children)) {
      observer.observe(child);
    }
    const stop = (): void => {
      observer.disconnect();
      list.removeEventListener('scroll', level);
      list.removeEventListener('wheel', stop);
      list.removeEventListener('touchstart', stop);
      list.removeEventListener('keydown', stop);
      window.clearTimeout(timer);
    };
    const timer = window.setTimeout(stop, SETTLE_MS);
    list.addEventListener('scroll', level);
    list.addEventListener('wheel', stop, { passive: true });
    list.addEventListener('touchstart', stop, { passive: true });
    list.addEventListener('keydown', stop);
    return stop;
  }, [open, activeKey]);

  useIsomorphicLayoutEffect(() => {
    const scroller = detailRef.current;
    if (scroller !== null) {
      scroller.scrollTop = 0;
    }
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>(
      '.aegis-workbench__tab--active',
    );
    if (strip && tab) {
      const left = tab.offsetLeft - strip.offsetLeft;
      if (left < strip.scrollLeft) {
        strip.scrollLeft = left;
      } else if (
        left + tab.offsetWidth >
        strip.scrollLeft + strip.clientWidth
      ) {
        strip.scrollLeft = left + tab.offsetWidth - strip.clientWidth;
      }
    }
  }, [activeKey]);

  const cls = [
    'aegis-workbench',
    open ? 'aegis-workbench--open' : '',
    activeTab ? 'aegis-workbench--active' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const listClass = `aegis-workbench__list aegis-workbench__list--${listSize}`;
  const leadingClass = `aegis-workbench__leading aegis-workbench__leading--${leadingSize}`;

  return (
    <div className={cls}>
      <div className="aegis-workbench__panes">
        {leading !== undefined &&
          (leadingLabel === undefined ? (
            <div className={leadingClass}>{leading}</div>
          ) : (
            <section className={leadingClass} aria-label={leadingLabel}>
              {leading}
            </section>
          ))}
        {listLabel === undefined ? (
          <div ref={listRef as RefObject<HTMLDivElement>} className={listClass}>
            {children}
          </div>
        ) : (
          <section ref={listRef} className={listClass} aria-label={listLabel}>
            {children}
          </section>
        )}
      </div>
      {open && (
        <div className="aegis-workbench__group">
          <div className="aegis-workbench__back">
            <LinkImpl to={backHref} className="aegis-workbench__back-link">
              {strings.workbenchBackToList}
            </LinkImpl>
          </div>
          <div
            ref={stripRef}
            role="region"
            aria-label={strings.workbenchTabs}
            className="aegis-workbench__tabs"
          >
            {tabs.map((tab) => (
              <div
                key={tab.key}
                data-workbench-tab={tab.key}
                className={[
                  'aegis-workbench__tab',
                  tab.active ? 'aegis-workbench__tab--active' : '',
                  tab.pinned ? '' : 'aegis-workbench__tab--preview',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <LinkImpl
                  to={tab.href}
                  className="aegis-workbench__tab-name"
                  aria-current={tab.active ? 'page' : undefined}
                >
                  {tab.name}
                </LinkImpl>
                <LinkImpl
                  to={tab.closeHref}
                  className="aegis-workbench__tab-close"
                >
                  <CloseGlyph />
                  <span className="aegis-workbench__hidden-text">
                    {strings.close}
                  </span>
                </LinkImpl>
              </div>
            ))}
          </div>
          <div ref={detailRef} className="aegis-workbench__detail">
            {activeTab ? detail : null}
          </div>
        </div>
      )}
      <span ref={pinRef} hidden>
        {pinTo !== null && (
          <LinkImpl to={pinTo} tabIndex={-1}>
            {null}
          </LinkImpl>
        )}
      </span>
    </div>
  );
}
