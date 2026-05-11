import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export interface ThemeState {
  /** What the user picked: 'light', 'dark', or 'system' (follow OS). */
  preference: ThemePreference;
  /** What's actually applied right now — never 'system'. */
  resolved: ThemeMode;
  setPreference: (next: ThemePreference) => void;
  /** Convenience cycle: light → dark → system → light. */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);
