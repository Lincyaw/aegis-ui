import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aegis.trajectories.compare.v1';
const MAX_PINS = 2;

function read(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * Pin / unpin trajectories for side-by-side compare. Capped at two so
 * the compare route always renders a 50/50 split.
 *
 * Multi-tab sync via the ``storage`` event so pinning a trajectory in
 * SessionList immediately updates the chip count in the header.
 */
export function useCompareList(): {
  pinned: string[];
  toggle: (rootSessionId: string) => void;
  remove: (rootSessionId: string) => void;
  clear: () => void;
  full: boolean;
} {
  const [pinned, setPinned] = useState<string[]>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) {
        setPinned(read());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((rsi: string) => {
    setPinned((cur) => {
      const next = cur.includes(rsi)
        ? cur.filter((x) => x !== rsi)
        : [...cur, rsi].slice(-MAX_PINS);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((rsi: string) => {
    setPinned((cur) => {
      const next = cur.filter((x) => x !== rsi);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setPinned([]);
  }, []);

  return { pinned, toggle, remove, clear, full: pinned.length >= MAX_PINS };
}
