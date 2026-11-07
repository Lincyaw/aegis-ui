import { useCallback, useSyncExternalStore } from 'react';

import { readStorage, writeStorage } from '../lib/storage';

const listeners = new Set<(key: string) => void>();
// Holds what was written while storage is blocked, so the value still changes.
const unstored = new Map<string, string>();

function read(key: string): string | null {
  return readStorage(key) ?? unstored.get(key) ?? null;
}

function serverSnapshot(): null {
  return null;
}

/**
 * Reads and writes one localStorage key. Every caller of the same key sees
 * a write, as does another tab. A server render and the hydration that
 * follows read `null`; the stored value applies right after.
 */
export function useStorageItem(
  key: string,
): [string | null, (value: string) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const onWrite = (written: string): void => {
        if (written === key) {
          onChange();
        }
      };
      const onStorage = (event: StorageEvent): void => {
        if (event.key === key) {
          onChange();
        }
      };
      listeners.add(onWrite);
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onWrite);
        window.removeEventListener('storage', onStorage);
      };
    },
    [key],
  );
  const getSnapshot = useCallback(() => read(key), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);

  const setValue = useCallback(
    (next: string) => {
      writeStorage(key, next);
      if (readStorage(key) === next) {
        unstored.delete(key);
      } else {
        unstored.set(key, next);
      }
      for (const listener of listeners) {
        listener(key);
      }
    },
    [key],
  );

  return [value, setValue];
}
