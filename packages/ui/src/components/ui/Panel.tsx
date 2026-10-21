import { type CSSProperties, type ReactNode, useRef } from 'react';

import {
  type ContainerSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './Panel.css';

export type PanelSurface = ContainerSurface;

interface PanelProps {
  title?: ReactNode;
  extra?: ReactNode;
  inverted?: boolean;
  padded?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  surface?: PanelSurface;
}

export function Panel({
  title,
  extra,
  inverted = false,
  padded = true,
  className,
  style,
  children,
  surface,
}: PanelProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, null, 'panel', wrapRef);
  const rootClass = [
    'aegis-panel',
    inverted ? 'aegis-panel--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = Boolean(title ?? extra);

  return (
    <section ref={wrapRef} className={rootClass} style={style} {...agentAttrs}>
      {showHeader && (
        <header className="aegis-panel__header">
          {typeof title === 'string' ? (
            <span className="aegis-panel__title">{title}</span>
          ) : (
            title
          )}
          {extra && <div className="aegis-panel__extra">{extra}</div>}
        </header>
      )}
      <div
        className={`aegis-panel__body${padded ? ' aegis-panel__body--padded' : ''}`}
      >
        {children}
      </div>
    </section>
  );
}
