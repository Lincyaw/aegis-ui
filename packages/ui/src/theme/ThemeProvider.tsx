import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { readStorage, writeStorage } from '../lib/storage';
import {
  ThemeContext,
  type ThemeMode,
  type ThemePreference,
  type ThemeState,
} from './themeContext';
import { DARK_QUERY, STORAGE_KEY } from './themeInitScript';

export type { ThemeMode, ThemePreference, ThemeState } from './themeContext';

const listeners = new Set<() => void>();
// Holds the choice when storage is blocked, so the toggle still works.
let unstoredPreference: ThemePreference | null = null;

function readPreference(): ThemePreference | null {
  const stored = readStorage(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return unstoredPreference;
}

function writePreference(next: ThemePreference): void {
  unstoredPreference = next;
  writeStorage(STORAGE_KEY, next);
  for (const listener of listeners) {
    listener();
  }
}

function subscribePreference(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changing the theme.
  const onStorage = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default preference if nothing is in localStorage. */
  defaultPreference?: ThemePreference;
}

/**
 * Owns theme state for the document. Reads/writes `data-theme` on
 * `document.documentElement`, persists user choice in localStorage, and
 * follows system theme changes when preference is 'system'. A server
 * render and the hydration that follows use `defaultPreference`; the
 * stored choice applies right after.
 */
export function ThemeProvider({
  children,
  defaultPreference = 'system',
}: ThemeProviderProps): ReactElement {
  const getSnapshot = useCallback(
    () => readPreference() ?? defaultPreference,
    [defaultPreference],
  );
  const getServerSnapshot = useCallback(
    () => defaultPreference,
    [defaultPreference],
  );
  const preference = useSyncExternalStore(
    subscribePreference,
    getSnapshot,
    getServerSnapshot,
  );
  const systemDark = useMediaQuery(DARK_QUERY);
  const resolved: ThemeMode =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useIsomorphicLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const toggle = useCallback(() => {
    writePreference(NEXT_PREFERENCE[getSnapshot()]);
  }, [getSnapshot]);

  const value = useMemo<ThemeState>(
    () => ({ preference, resolved, setPreference: writePreference, toggle }),
    [preference, resolved, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
