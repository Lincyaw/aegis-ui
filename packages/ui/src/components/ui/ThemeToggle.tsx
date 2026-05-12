import type { ReactElement } from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
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
  /** Optional aegis-ui agent action — fired after the toggle runs. */
  action?: AegisAction<void, unknown>;
}

/**
 * One-click theme cycler — light → dark → system → light. Lives in the
 * shell's header. Reads/writes via the ThemeProvider context.
 */
export function ThemeToggle({
  className,
  action,
}: ThemeToggleProps): ReactElement {
  const { preference, toggle } = useTheme();
  const bound = useAegisAction<void, unknown>(action);
  const cls = ['aegis-theme-toggle', className ?? ''].filter(Boolean).join(' ');

  const handleClick = (): void => {
    toggle();
    if (action) {
      void bound.invoke();
    }
  };

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      aria-label={LABELS[preference]}
      title={LABELS[preference]}
      data-agent-action-id={action?.id}
    >
      <span className="aegis-theme-toggle__glyph" aria-hidden="true">
        {GLYPHS[preference]}
      </span>
    </button>
  );
}
