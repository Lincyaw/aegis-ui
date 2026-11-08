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
  /**
   * Break a long value at any character, so an id such as a digest fits a
   * narrow column. A text or number value is never broken narrower than
   * itself or 16 characters, whichever is less, so `null` and `1` stay whole.
   */
  wrap?: boolean;
  as?: 'span' | 'div';
  className?: string;
  style?: CSSProperties;
  surface?: MonoValueSurface;
}

/**
 * An id, a path or a piece of code in the mono face. Numbers, durations and
 * times are not set in it: they take the numeric face (`--font-numeric`) with
 * tabular figures.
 */
export function MonoValue({
  children,
  size = 'base',
  weight = 'medium',
  tone = 'default',
  inverted = false,
  wrap = false,
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
    wrap ? 'aegis-mono--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const length =
    typeof children === 'string' || typeof children === 'number'
      ? String(children).length
      : undefined;
  const lengthStyle =
    wrap && length !== undefined
      ? ({ '--aegis-mono-length': length, ...style } as CSSProperties)
      : style;
  return (
    <Tag ref={wrapRef} className={cls} style={lengthStyle} {...agentAttrs}>
      {children}
    </Tag>
  );
}
