import { type RefObject, useEffect, useRef } from 'react';

/** Calls `onOutsideClick` on any mousedown outside `ref` while `active`. */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
  active = true,
): void {
  const handlerRef = useRef(onOutsideClick);
  handlerRef.current = onOutsideClick;

  useEffect(() => {
    if (!active) {
      return;
    }
    const onMouseDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handlerRef.current();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [ref, active]);
}
