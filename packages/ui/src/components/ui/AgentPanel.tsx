import { type ReactNode, useRef } from 'react';

import {
  type ContainerSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './AgentPanel.css';

export type AgentPanelSurface = ContainerSurface;

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
  const agentAttrs = usePrimitiveSurface(surface, null, 'panel', wrapRef);
  const cls = ['aegis-agent-panel', className ?? ''].filter(Boolean).join(' ');

  return (
    <aside
      ref={wrapRef}
      className={cls}
      aria-label="Agent panel"
      {...agentAttrs}
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
