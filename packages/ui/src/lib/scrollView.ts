/** The visible part of a scroller, in viewport coordinates. */
export interface ViewBounds {
  top: number;
  bottom: number;
}

/** The element whose `scrollTop` moves the view; null means the viewport. */
export function scrollerOf(container: HTMLElement | null): HTMLElement {
  return container ?? document.documentElement;
}

export function viewBoundsOf(container: HTMLElement | null): ViewBounds {
  if (!container) {
    return { top: 0, bottom: document.documentElement.clientHeight };
  }
  const top = container.getBoundingClientRect().top + container.clientTop;
  return { top, bottom: top + container.clientHeight };
}

/** An IntersectionObserver `rootMargin` whose bottom edge is the activation line. */
export function activationRootMargin(percent: number): string {
  return `0% 0% -${100 - percent}% 0%`;
}

/**
 * The index of the last element whose top has passed `percent` of the
 * view; at the end of the scroll, the last element in view, so a short
 * final element can still become current.
 */
export function findCurrentIndex(
  elements: HTMLElement[],
  container: HTMLElement | null,
  percent: number,
): number {
  const view = viewBoundsOf(container);
  const line = view.top + ((view.bottom - view.top) * percent) / 100;
  const scroller = scrollerOf(container);
  const atEnd =
    Math.ceil(scroller.scrollTop + scroller.clientHeight) >=
    scroller.scrollHeight;
  let current = 0;
  elements.forEach((element, index) => {
    const { top } = element.getBoundingClientRect();
    if (top <= line || (atEnd && top < view.bottom)) {
      current = index;
    }
  });
  return current;
}
