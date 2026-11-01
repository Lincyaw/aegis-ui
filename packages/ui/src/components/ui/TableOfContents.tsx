import {
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  activationRootMargin,
  findCurrentIndex,
  scrollerOf,
  viewBoundsOf,
} from '../../lib/scrollView';
import { useStrings } from '../../locale';
import './TableOfContents.css';

export interface TableOfContentsItem {
  /** The id of the section element, already in the document, the item links to. */
  id: string;
  label: ReactNode;
  /** Nesting depth of the section; 2 and 3 indent the label. Defaults to 1. */
  level?: 1 | 2 | 3;
}

export interface TableOfContentsProps {
  /** The sections in document order. */
  items: TableOfContentsItem[];
  /** Controls the current item; omit it to follow the scroll position. */
  currentId?: string;
  /** Called with the id that scrolling or a click makes current. */
  onCurrentChange?: (id: string) => void;
  /** The element that scrolls the sections; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

/** A section becomes current once its top passes this share of the view. */
const ACTIVATION_PERCENT = 25;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * The section a click scrolled to keeps the highlight while the scroll
 * runs (`settled` false until scrollend) and afterwards for as long as the
 * view stays at `top`, even if the geometry would pick another section.
 */
interface ClickScroll {
  top: number;
  settled: boolean;
}

function isScrolledTo(container: HTMLElement | null, top: number): boolean {
  return Math.abs(scrollerOf(container).scrollTop - top) < 1;
}

/** The scroll offset that puts the section's top, less its scroll-margin, at the top of the view. */
function sectionScrollTop(
  section: HTMLElement,
  container: HTMLElement | null,
): number {
  const scroller = scrollerOf(container);
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop);
  const top =
    section.getBoundingClientRect().top -
    viewBoundsOf(container).top +
    scroller.scrollTop -
    margin;
  return Math.min(
    Math.max(top, 0),
    scroller.scrollHeight - scroller.clientHeight,
  );
}

export function TableOfContents({
  items,
  currentId,
  onCurrentChange,
  scrollContainer = null,
  className,
}: TableOfContentsProps): ReactElement {
  const strings = useStrings();
  const [trackedId, setTrackedId] = useState(() => items[0]?.id);
  const trackedIdRef = useRef(trackedId);
  const onCurrentChangeRef = useRef(onCurrentChange);
  const clickScrollRef = useRef<ClickScroll | null>(null);
  const activeId = currentId ?? trackedId;
  const sectionIds = items.map((item) => item.id).join(' ');

  useEffect(() => {
    onCurrentChangeRef.current = onCurrentChange;
  }, [onCurrentChange]);

  const track = useCallback((id: string): void => {
    if (id === trackedIdRef.current) {
      return;
    }
    trackedIdRef.current = id;
    setTrackedId(id);
    onCurrentChangeRef.current?.(id);
  }, []);

  useEffect(() => {
    const sections = sectionIds.split(' ').flatMap((id) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });
    if (sections.length === 0) {
      return undefined;
    }
    const sync = (): void => {
      const clickScroll = clickScrollRef.current;
      if (clickScroll) {
        if (
          !clickScroll.settled ||
          isScrolledTo(scrollContainer, clickScroll.top)
        ) {
          return;
        }
        clickScrollRef.current = null;
      }
      track(
        sections[
          findCurrentIndex(sections, scrollContainer, ACTIVATION_PERCENT)
        ].id,
      );
    };
    /* A jump can skip the activation band without an intersection change,
     * so the settled position is checked again. */
    const handleScrollEnd = (): void => {
      if (clickScrollRef.current) {
        clickScrollRef.current = { ...clickScrollRef.current, settled: true };
      }
      sync();
    };
    const observer = new IntersectionObserver(sync, {
      root: scrollContainer,
      rootMargin: activationRootMargin(ACTIVATION_PERCENT),
    });
    for (const section of sections) {
      observer.observe(section);
    }
    const scrollEvents: EventTarget = scrollContainer ?? document;
    scrollEvents.addEventListener('scrollend', handleScrollEnd);
    return () => {
      observer.disconnect();
      scrollEvents.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [sectionIds, scrollContainer, track]);

  const handleClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: string,
  ): void => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (id !== activeId) {
      onCurrentChange?.(id);
    }
    trackedIdRef.current = id;
    setTrackedId(id);
    const section = document.getElementById(id);
    if (!section) {
      return;
    }
    // As an in-page link does: the URL names the section, and the next Tab
    // continues from the section rather than from the contents.
    window.history.replaceState(window.history.state, '', `#${id}`);
    if (!section.hasAttribute('tabindex')) {
      section.tabIndex = -1;
    }
    section.focus({ preventScroll: true });
    const top = sectionScrollTop(section, scrollContainer);
    const arrived = isScrolledTo(scrollContainer, top);
    /* Without scrollend support nothing would settle the click. */
    clickScrollRef.current = {
      top,
      settled: arrived || !('onscrollend' in window),
    };
    if (arrived) {
      return;
    }
    scrollerOf(scrollContainer).scrollTo({
      top,
      behavior: window.matchMedia(REDUCED_MOTION).matches
        ? 'instant'
        : 'smooth',
    });
  };

  const cls = ['aegis-toc', className ?? ''].filter(Boolean).join(' ');

  return (
    <nav aria-label={strings.tableOfContents} className={cls}>
      <ol className="aegis-toc__list">
        {items.map((item) => {
          const current = item.id === activeId;
          const level = item.level ?? 1;
          const linkCls = [
            'aegis-toc__link',
            current ? 'aegis-toc__link--current' : '',
            level > 1 ? `aegis-toc__link--level-${level}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={linkCls}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => {
                  handleClick(event, item.id);
                }}
              >
                <span className="aegis-toc__indicator" aria-hidden="true" />
                <span className="aegis-toc__label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
