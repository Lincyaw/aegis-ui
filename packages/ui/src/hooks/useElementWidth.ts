import { type RefObject, useLayoutEffect, useState } from 'react';

/** Content-box width of `ref`'s element in CSS px, kept current on resize. */
export function useElementWidth(ref: RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }
    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
}
