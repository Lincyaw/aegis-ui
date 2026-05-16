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

const DEFAULT_MIN = 200;
const DEFAULT_MAX = 800;
const KEYBOARD_STEP = 16;

export interface UseResizableOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  side: 'left' | 'right';
  persistKey?: string;
  onCollapse?: () => void;
}

export interface UseResizableReturn {
  width: number;
  handleProps: HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
}

function readPersisted(key: string | undefined): number | undefined {
  if (key === undefined || typeof window === 'undefined') {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return undefined;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writePersisted(key: string | undefined, value: number): void {
  if (key === undefined || typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, String(Math.round(value)));
  } catch {
    /* localStorage unavailable — silently skip */
  }
}

export function useResizable(opts: UseResizableOptions): UseResizableReturn {
  const {
    initialWidth,
    minWidth = DEFAULT_MIN,
    maxWidth = DEFAULT_MAX,
    side,
    persistKey,
    onCollapse,
  } = opts;

  const clamp = useCallback(
    (value: number) => Math.min(Math.max(value, minWidth), maxWidth),
    [minWidth, maxWidth],
  );

  const [width, setWidth] = useState<number>(() => {
    const persisted = readPersisted(persistKey);
    const seed = persisted ?? initialWidth;
    return Math.min(Math.max(seed, minWidth), maxWidth);
  });
  const [isDragging, setDragging] = useState(false);

  const startPos = useRef(0);
  const startWidth = useRef(0);
  const onCollapseRef = useRef(onCollapse);
  const collapseFiredRef = useRef(false);

  useEffect(() => {
    onCollapseRef.current = onCollapse;
  }, [onCollapse]);

  useEffect(() => {
    writePersisted(persistKey, width);
  }, [persistKey, width]);

  // Re-clamp if bounds change.
  useEffect(() => {
    setWidth((prev) => clamp(prev));
  }, [clamp]);

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
    [side, minWidth, clamp],
  );

  const stopDragging = useRef<() => void>(() => undefined);

  const handlePointerUp = useCallback(() => {
    stopDragging.current();
  }, []);

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
      startWidth.current = width;
      collapseFiredRef.current = false;
      setDragging(true);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [width, handlePointerMove, handlePointerUp],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
      const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
      if (event.key === grow) {
        event.preventDefault();
        setWidth((prev) => clamp(prev + KEYBOARD_STEP));
      } else if (event.key === shrink) {
        event.preventDefault();
        setWidth((prev) => {
          const next = prev - KEYBOARD_STEP;
          if (next < minWidth && !collapseFiredRef.current) {
            collapseFiredRef.current = true;
            onCollapseRef.current?.();
          }
          return clamp(next);
        });
      }
    },
    [side, clamp, minWidth],
  );

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

  return { width, handleProps, isDragging };
}
