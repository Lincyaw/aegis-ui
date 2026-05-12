import { type CSSProperties, type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './MonoValue.css';

export interface MonoValueSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (
    children: ReactNode,
  ) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface MonoValueProps {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg';
  weight?: 'regular' | 'medium';
  inverted?: boolean;
  as?: 'span' | 'div';
  className?: string;
  style?: CSSProperties;
  surface?: MonoValueSurface;
}

export function MonoValue({
  children,
  size = 'base',
  weight = 'medium',
  inverted = false,
  as: Tag = 'span',
  className,
  style,
  surface,
}: MonoValueProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useAegisSurface<ReactNode>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'value',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: children,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const cls = [
    'aegis-mono',
    `aegis-mono--${size}`,
    `aegis-mono--${weight}`,
    inverted ? 'aegis-mono--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag
      ref={wrapRef}
      className={cls}
      style={style}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {children}
    </Tag>
  );
}

export default MonoValue;
