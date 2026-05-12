import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './Chip.css';

export interface ChipSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (
    children: ReactNode,
  ) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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
  useAegisSurface<ReactNode>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'tag',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: children,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
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
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {leading && <span className="aegis-chip__leading">{leading}</span>}
      <span className="aegis-chip__label">{children}</span>
    </span>
  );
}

export default Chip;
