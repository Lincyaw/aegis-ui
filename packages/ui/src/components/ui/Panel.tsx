import { type CSSProperties, type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './Panel.css';

export interface PanelSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project?: () => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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
  useAegisSurface<null>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'panel',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: null,
    project: surface?.project ?? (() => ({})),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const rootClass = [
    'aegis-panel',
    inverted ? 'aegis-panel--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = Boolean(title ?? extra);

  return (
    <section
      ref={wrapRef}
      className={rootClass}
      style={style}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
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

export default Panel;
