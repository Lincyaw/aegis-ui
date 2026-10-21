import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './Chip.css';

export type ChipSurface = PrimitiveSurface<ReactNode>;

interface ChipProps {
  children: ReactNode;
  /** Visual treatment. */
  tone?: 'default' | 'ink' | 'warning' | 'ghost';
  /** Optional leading dot/icon node. */
  leading?: ReactNode;
  className?: string;
  onClick?: () => void;
  surface?: ChipSurface;
}

export function Chip({
  children,
  tone = 'default',
  leading,
  className,
  onClick,
  surface,
}: ChipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, children, 'tag', wrapRef);
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
      ref={wrapRef}
      className={cls}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...agentAttrs}
    >
      {leading && <span className="aegis-chip__leading">{leading}</span>}
      <span className="aegis-chip__label">{children}</span>
    </span>
  );
}
