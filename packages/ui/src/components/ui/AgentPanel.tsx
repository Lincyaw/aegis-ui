import type { ReactNode } from 'react';

import './AgentPanel.css';

interface AgentPanelProps {
  title?: ReactNode;
  /** Header right-side slot (e.g. close button). */
  headerActions?: ReactNode;
  /** The conversation area — typically ChatMessageList. */
  children: ReactNode;
  /** Sticky footer — typically ChatComposer. */
  footer?: ReactNode;
  className?: string;
}

export function AgentPanel({
  title,
  headerActions,
  children,
  footer,
  className,
}: AgentPanelProps) {
  const cls = ['aegis-agent-panel', className ?? ''].filter(Boolean).join(' ');

  return (
    <aside className={cls} aria-label="Agent panel">
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
