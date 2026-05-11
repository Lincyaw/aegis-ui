import type { ReactElement } from 'react';

import { useTheme } from '../../theme/useTheme';
import './ThemeToggle.css';

const LABELS = {
  light: 'Switch to dark theme',
  dark: 'Follow system theme',
  system: 'Switch to light theme',
} as const;

const GLYPHS = {
  light: '☀',
  dark: '☾',
  system: '◐',
} as const;

interface ThemeToggleProps {
  className?: string;
}

/**
 * One-click theme cycler — light → dark → system → light. Lives in the
 * shell's header. Reads/writes via the ThemeProvider context.
 */
export function ThemeToggle({ className }: ThemeToggleProps): ReactElement {
  const { preference, toggle } = useTheme();
  const cls = ['aegis-theme-toggle', className ?? ''].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={toggle}
      aria-label={LABELS[preference]}
      title={LABELS[preference]}
    >
      <span className="aegis-theme-toggle__glyph" aria-hidden="true">
        {GLYPHS[preference]}
      </span>
    </button>
  );
}
