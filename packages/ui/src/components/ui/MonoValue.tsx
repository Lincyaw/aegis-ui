import { type CSSProperties, type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './MonoValue.css';

export type MonoValueSurface = PrimitiveSurface<ReactNode>;

interface MonoValueProps {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg';
  weight?: 'regular' | 'medium';
  /** Ink colour. `danger` is the anomaly red — failures only. */
  tone?: 'default' | 'success' | 'danger' | 'muted';
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
  tone = 'default',
  inverted = false,
  as: Tag = 'span',
  className,
  style,
  surface,
}: MonoValueProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const agentAttrs = usePrimitiveSurface(surface, children, 'value', wrapRef);
  const cls = [
    'aegis-mono',
    `aegis-mono--${size}`,
    `aegis-mono--${weight}`,
    tone === 'default' ? '' : `aegis-mono--${tone}`,
    inverted ? 'aegis-mono--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag ref={wrapRef} className={cls} style={style} {...agentAttrs}>
      {children}
    </Tag>
  );
}
