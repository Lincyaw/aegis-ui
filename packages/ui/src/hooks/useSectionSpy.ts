import {
  type MouseEvent,
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
} from '../lib/scrollView';

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

export interface UseSectionSpyOptions {
  /** The ids of the section elements, in document order. */
  ids: string[];
  /** A section becomes current once its top passes this share of the view. */
  activationPercent: number;
  /** Controls the current section; omit it to follow the scroll position. */
  currentId?: string;
  /** Called with the id that scrolling or a click makes current. */
  onCurrentChange?: (id: string) => void;
  /** The element that scrolls the sections; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  /**
   * Changes when a section element appears, disappears or is replaced;
   * tracking then starts over on the elements now in the document.
   */
  sectionsVersion?: number;
}

export interface UseSectionSpyResult {
  activeId: string | undefined;
  /** Scrolls to the section as an in-page link does; a modified click stays a plain link. */
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}

/**
 * Tracks which of a page's sections is current as the page scrolls, for a
 * nav that follows the reader through a long page.
 */
export function useSectionSpy({
  ids,
  activationPercent,
  currentId,
  onCurrentChange,
  scrollContainer = null,
  sectionsVersion = 0,
}: UseSectionSpyOptions): UseSectionSpyResult {
  const [trackedId, setTrackedId] = useState<string | undefined>(ids[0]);
  const trackedIdRef = useRef(trackedId);
  const onCurrentChangeRef = useRef(onCurrentChange);
  const clickScrollRef = useRef<ClickScroll | null>(null);
  const activeId = currentId ?? trackedId;
  const sectionIds = ids.join(' ');

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
    const sections = (sectionIds === '' ? [] : sectionIds.split(' ')).flatMap(
      (id) => {
        const section = document.getElementById(id);
        return section ? [section] : [];
      },
    );
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
        sections[findCurrentIndex(sections, scrollContainer, activationPercent)]
          .id,
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
      rootMargin: activationRootMargin(activationPercent),
    });
    for (const section of sections) {
      observer.observe(section);
    }
    /* Content that grows, shrinks, arrives or leaves after the first
     * measurement (a diagram or image rendering) moves the sections without
     * a scroll and often without an intersection change, so their parents
     * and siblings are watched too, including siblings added later. */
    let frame = 0;
    const syncNextFrame = (): void => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          sync();
        });
      }
    };
    const resizeObserver = new ResizeObserver(syncNextFrame);
    const parents = new Set(
      sections.flatMap((section) =>
        section.parentElement ? [section.parentElement] : [],
      ),
    );
    const watched = new Set<Element>();
    const watchAround = (): void => {
      const around = new Set<Element>(sections);
      for (const parent of parents) {
        around.add(parent);
        for (const child of parent.children) {
          around.add(child);
        }
      }
      for (const element of watched) {
        if (!around.has(element)) {
          resizeObserver.unobserve(element);
          watched.delete(element);
        }
      }
      for (const element of around) {
        if (!watched.has(element)) {
          resizeObserver.observe(element);
          watched.add(element);
        }
      }
    };
    watchAround();
    const mutationObserver = new MutationObserver(() => {
      watchAround();
      syncNextFrame();
    });
    for (const parent of parents) {
      mutationObserver.observe(parent, { childList: true });
    }
    const scrollEvents: EventTarget = scrollContainer ?? document;
    scrollEvents.addEventListener('scrollend', handleScrollEnd);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      cancelAnimationFrame(frame);
      scrollEvents.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [sectionIds, activationPercent, scrollContainer, track, sectionsVersion]);

  const onLinkClick = (
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
    // continues from the section rather than from the nav.
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

  return { activeId, onLinkClick };
}
