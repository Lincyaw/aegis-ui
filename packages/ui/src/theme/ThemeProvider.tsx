import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ThemeContext,
  type ThemeMode,
  type ThemePreference,
  type ThemeState,
} from './themeContext';

export type { ThemeMode, ThemePreference, ThemeState } from './themeContext';

const STORAGE_KEY = 'aegis-ui:theme';

function readPreference(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
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

  // Apply to <html> + persist.
  useEffect(() => {
    const next = resolve(preference);
    setResolved(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.style.colorScheme = next;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  }, [preference]);

  // Track system changes while preference is 'system'.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') {
      return;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => {
      const next: ThemeMode = mql.matches ? 'dark' : 'light';
      setResolved(next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.style.colorScheme = next;
      }
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference]);

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
