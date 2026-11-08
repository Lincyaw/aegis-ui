import type { ReactElement } from 'react';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import { useStrings } from '../../locale';
import { useTheme } from '../../theme/useTheme';
import './ThemeToggle.css';

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
  const strings = useStrings();
  const { preference, toggle } = useTheme();
  const bound = useAegisAction<void, unknown>(action);
  const label = strings.themeToggle(preference);
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
      aria-label={label}
      title={label}
      data-agent-action-id={action?.id}
    >
      <span className="aegis-theme-toggle__glyph" aria-hidden="true">
        {GLYPHS[preference]}
      </span>
    </button>
  );
}
