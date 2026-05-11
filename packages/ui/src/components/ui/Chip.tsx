import type { KeyboardEvent, ReactNode } from 'react';

import './Chip.css';

interface ChipProps {
  children: ReactNode;
  /** Visual treatment. */
  tone?: 'default' | 'ink' | 'warning' | 'ghost';
  /** Optional leading dot/icon node. */
  leading?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Chip({
  children,
  tone = 'default',
  leading,
  className,
  onClick,
}: ChipProps) {
  const cls = ['aegis-chip', `aegis-chip--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  const interactive = Boolean(onClick);
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
    if (!onClick) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <span
      className={cls}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {leading && <span className="aegis-chip__leading">{leading}</span>}
      <span className="aegis-chip__label">{children}</span>
    </span>
  );
}

export default Chip;
