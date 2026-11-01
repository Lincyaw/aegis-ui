import { type RefCallback, useCallback, useEffect, useState } from 'react';

import { viewBoundsOf } from '../lib/scrollView';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { useMediaQuery } from './useMediaQuery';

/**
 * Which part of an element's pass through the view maps to 0–1, named
 * after CSS `animation-range`:
 * - `entry`: from its top reaching the bottom of the view until it is
 *   fully in view (or, if taller than the view, until it fills it).
 * - `exit`: from it starting to leave until its bottom passes the top.
 * - `cover`: from its top reaching the bottom until its bottom passes the top.
 * - `contain`: while it sits wholly inside the view, or, if taller,
 *   while it fills the view.
 */
export type ScrollProgressRange = 'entry' | 'exit' | 'cover' | 'contain';

export interface UseScrollProgressOptions {
  /** Defaults to `entry`, which finishes drawing while the element is still in view. */
  range?: ScrollProgressRange;
  /** The element that scrolls; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
}

export interface UseScrollProgressResult<T extends HTMLElement> {
  /** Attach to the element whose position drives the progress. */
  ref: RefCallback<T>;
  /**
   * 0 at the start of the range, 1 at its end, following the scroll both
   * ways. Stays 1 under prefers-reduced-motion and until the element is
   * laid out, so content without the effect shows its final state.
   */
  progress: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** `top` is the element's top relative to the view's top. */
function progressIn(
  range: ScrollProgressRange,
  top: number,
  height: number,
  view: number,
): number {
  let start: number;
  let end: number;
  switch (range) {
    case 'entry':
      start = view;
      end = height <= view ? view - height : 0;
      break;
    case 'exit':
      start = height <= view ? 0 : view - height;
      end = -height;
      break;
    case 'cover':
      start = view;
      end = -height;
      break;
    case 'contain':
      start = height <= view ? view - height : 0;
      end = height <= view ? 0 : view - height;
      break;
  }
  if (start === end) {
    return top <= end ? 1 : 0;
  }
  return Math.min(1, Math.max(0, (start - top) / (start - end)));
}

/**
 * Reports how far an element has travelled through the view as a number
 * from 0 to 1, recomputed once per animation frame while the page scrolls
 * or resizes. Use it for motion tied to the scroll position, such as a
 * chart that draws as its section comes into view; for an entrance that
 * plays once, use `Reveal`.
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>({
  range = 'entry',
  scrollContainer = null,
}: UseScrollProgressOptions = {}): UseScrollProgressResult<T> {
  const [element, setElement] = useState<T | null>(null);
  const [progress, setProgress] = useState(1);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const ref = useCallback<RefCallback<T>>((node) => {
    setElement(node);
  }, []);

  const measure = useCallback((): void => {
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const view = viewBoundsOf(scrollContainer);
    const next = progressIn(
      range,
      rect.top - view.top,
      rect.height,
      view.bottom - view.top,
    );
    setProgress(Math.round(next * 1000) / 1000);
  }, [element, range, scrollContainer]);

  // Measured before paint, so content below the fold never flashes its final state.
  useIsomorphicLayoutEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      return;
    }
    measure();
  }, [measure, reducedMotion]);

  useEffect(() => {
    if (!element || reducedMotion) {
      return undefined;
    }
    let frame = 0;
    const schedule = (): void => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          measure();
        });
      }
    };
    const scrollEvents: EventTarget = scrollContainer ?? window;
    scrollEvents.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      scrollEvents.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [element, measure, reducedMotion, scrollContainer]);

  return { ref, progress };
}
