import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readStorage, writeStorage } from '../lib/storage';
import {
  ThemeContext,
  type ThemeMode,
  type ThemePreference,
  type ThemeState,
} from './themeContext';

export type { ThemeMode, ThemePreference, ThemeState } from './themeContext';

const STORAGE_KEY = 'aegis-ui:theme';

function readPreference(): ThemePreference | null {
  const stored = readStorage(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(preference: ThemePreference): ThemeMode {
  if (preference === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return preference;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default preference if nothing is in localStorage. */
  defaultPreference?: ThemePreference;
}

/**
 * Owns theme state for the document. Reads/writes `data-theme` on
 * `document.documentElement`, persists user choice in localStorage, and
 * listens for system theme changes when preference is 'system'.
 */
export function ThemeProvider({
  children,
  defaultPreference = 'system',
}: ThemeProviderProps): ReactElement {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => readPreference() ?? defaultPreference,
  );
  const [resolved, setResolved] = useState<ThemeMode>(() =>
    resolve(preference),
  );

  useEffect(() => {
    setResolved(resolve(preference));
    writeStorage(STORAGE_KEY, preference);
  }, [preference]);

  // Track system changes while preference is 'system'.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') {
      return;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => {
      setResolved(mql.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((prev) => {
      if (prev === 'light') {
        return 'dark';
      }
      if (prev === 'dark') {
        return 'system';
      }
      return 'light';
    });
  }, []);

  const value = useMemo<ThemeState>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
