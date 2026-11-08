// Resize hook adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/hooks/useResizable.ts
import {
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { readStorage, writeStorage } from '../lib/storage';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

const DEFAULT_MIN = 200;
const DEFAULT_MAX = 800;
const DEFAULT_KEYBOARD_STEP = 16;

export interface UseResizableOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  side: 'left' | 'right';
  persistKey?: string;
  onCollapse?: () => void;
  /** Width change per arrow-key press, in px. */
  keyboardStep?: number;
  /**
   * Narrows a proposed width after the min/max clamp, e.g. so a neighbouring
   * pane keeps its own minimum. The result is clamped to min/max again.
   */
  constrainWidth?: (width: number) => number;
}

export interface UseResizableReturn {
  width: number;
  handleProps: HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
  /** Restores `initialWidth`, clamped and constrained like any other change. */
  reset: () => void;
}

function readPersisted(key: string | undefined): number | undefined {
  const raw = key === undefined ? null : readStorage(key);
  if (raw === null) {
    return undefined;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useResizable(opts: UseResizableOptions): UseResizableReturn {
  const {
    initialWidth,
    minWidth = DEFAULT_MIN,
    maxWidth = DEFAULT_MAX,
    side,
    persistKey,
    onCollapse,
    keyboardStep = DEFAULT_KEYBOARD_STEP,
    constrainWidth,
  } = opts;

  const constrainRef = useRef(constrainWidth);

  useEffect(() => {
    constrainRef.current = constrainWidth;
  }, [constrainWidth]);

  const clamp = useCallback(
    (value: number) => {
      const bound = (v: number): number =>
        Math.min(Math.max(v, minWidth), maxWidth);
      const constrain = constrainRef.current;
      return constrain ? bound(constrain(bound(value))) : bound(value);
    },
    [minWidth, maxWidth],
  );

  const [width, setWidthState] = useState<number>(() =>
    Math.min(Math.max(initialWidth, minWidth), maxWidth),
  );
  const widthRef = useRef(width);
  const setWidth = useCallback((next: number) => {
    widthRef.current = next;
    setWidthState(next);
  }, []);
  const [isDragging, setDragging] = useState(false);

  const persist = useCallback(
    (next: number) => {
      if (persistKey !== undefined) {
        writeStorage(persistKey, String(Math.round(next)));
      }
    },
    [persistKey],
  );

  const startPos = useRef(0);
  const startWidth = useRef(0);
  const onCollapseRef = useRef(onCollapse);
  const collapseFiredRef = useRef(false);

  useEffect(() => {
    onCollapseRef.current = onCollapse;
  }, [onCollapse]);

  // Read after mount, so a server render and the hydration that follows
  // agree; a layout effect applies it before the first paint. New bounds
  // re-apply the stored width, or re-clamp the current one.
  useIsomorphicLayoutEffect(() => {
    setWidth(clamp(readPersisted(persistKey) ?? widthRef.current));
  }, [persistKey, clamp, setWidth]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const delta = event.clientX - startPos.current;
      const directionMultiplier = side === 'left' ? 1 : -1;
      const proposed = startWidth.current + delta * directionMultiplier;

      if (proposed < minWidth && !collapseFiredRef.current) {
        collapseFiredRef.current = true;
        onCollapseRef.current?.();
      }

      setWidth(clamp(proposed));
    },
    [side, minWidth, clamp, setWidth],
  );

  const stopDragging = useRef<() => void>(() => undefined);

  const handlePointerUp = useCallback(() => {
    stopDragging.current();
    persist(widthRef.current);
  }, [persist]);

  useEffect(() => {
    stopDragging.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      setDragging(false);
    };
    return () => {
      stopDragging.current();
    };
  }, [handlePointerMove, handlePointerUp]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      startPos.current = event.clientX;
      startWidth.current = widthRef.current;
      collapseFiredRef.current = false;
      setDragging(true);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [handlePointerMove, handlePointerUp],
  );

  const commit = useCallback(
    (next: number) => {
      setWidth(next);
      persist(next);
    },
    [setWidth, persist],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
      const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
      if (event.key === grow) {
        event.preventDefault();
        commit(clamp(widthRef.current + keyboardStep));
      } else if (event.key === shrink) {
        event.preventDefault();
        const next = widthRef.current - keyboardStep;
        if (next < minWidth && !collapseFiredRef.current) {
          collapseFiredRef.current = true;
          onCollapseRef.current?.();
        }
        commit(clamp(next));
      } else if (event.key === 'Home' || event.key === 'End') {
        // Like the arrows, Home / End move the handle itself: to its
        // leftmost / rightmost position.
        event.preventDefault();
        const atLeftEdge = side === 'left' ? minWidth : maxWidth;
        const atRightEdge = side === 'left' ? maxWidth : minWidth;
        commit(clamp(event.key === 'Home' ? atLeftEdge : atRightEdge));
      }
    },
    [side, clamp, commit, minWidth, maxWidth, keyboardStep],
  );

  const reset = useCallback(() => {
    commit(clamp(initialWidth));
  }, [clamp, commit, initialWidth]);

  const handleProps = useMemo<HTMLAttributes<HTMLDivElement>>(
    () => ({
      role: 'separator',
      tabIndex: 0,
      'aria-orientation': 'vertical',
      'aria-valuemin': minWidth,
      'aria-valuemax': maxWidth,
      'aria-valuenow': Math.round(width),
      onPointerDown,
      onKeyDown,
    }),
    [minWidth, maxWidth, width, onPointerDown, onKeyDown],
  );

  return { width, handleProps, isDragging, reset };
}
