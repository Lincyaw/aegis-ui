import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './AgentPanel.css';

export interface AgentPanelSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project?: () => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface AgentPanelProps {
  title?: ReactNode;
  /** Header right-side slot (e.g. close button). */
  headerActions?: ReactNode;
  /** The conversation area — typically ChatMessageList. */
  children: ReactNode;
  /** Sticky footer — typically ChatComposer. */
  footer?: ReactNode;
  className?: string;
  surface?: AgentPanelSurface;
}

export function AgentPanel({
  title,
  headerActions,
  children,
  footer,
  className,
  surface,
}: AgentPanelProps) {
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
  const cls = ['aegis-agent-panel', className ?? ''].filter(Boolean).join(' ');

  return (
    <aside
      ref={wrapRef}
      className={cls}
      aria-label="Agent panel"
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {(title ?? headerActions) && (
        <header className="aegis-agent-panel__header">
          <div className="aegis-agent-panel__title">{title}</div>
          {headerActions && (
            <div className="aegis-agent-panel__actions">{headerActions}</div>
          )}
        </header>
      )}
      <div className="aegis-agent-panel__body">{children}</div>
      {footer && <div className="aegis-agent-panel__footer">{footer}</div>}
    </aside>
  );
}

export default AgentPanel;
