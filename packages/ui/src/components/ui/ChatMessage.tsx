import { type ReactNode, useRef } from 'react';

import type { AgentMessageRole } from '../../agent/agentContext';
import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './ChatMessage.css';

export interface ChatMessageSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    role: AgentMessageRole;
    content: ReactNode;
    timestamp?: string;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface ChatMessageProps {
  role: AgentMessageRole;
  content: ReactNode;
  /** Optional timestamp. ISO or already-formatted string. */
  timestamp?: string;
  /** Avatar slot — typically <Avatar/> or an icon. */
  avatar?: ReactNode;
  /** Optional name above the bubble (e.g. "You" / "Aegis Assistant"). */
  senderName?: ReactNode;
  /** Rendered after content — typically CommandInvocationCard list. */
  footer?: ReactNode;
  className?: string;
  surface?: ChatMessageSurface;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  avatar,
  senderName,
  footer,
  className,
  surface,
}: ChatMessageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<{
    role: AgentMessageRole;
    content: ReactNode;
    timestamp?: string;
  }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'message',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { role, content, timestamp },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const cls = ['aegis-chat-msg', `aegis-chat-msg--${role}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {avatar && <div className="aegis-chat-msg__avatar">{avatar}</div>}
      <div className="aegis-chat-msg__column">
        {(senderName ?? timestamp) && (
          <div className="aegis-chat-msg__meta">
            {senderName && (
              <span className="aegis-chat-msg__sender">{senderName}</span>
            )}
            {timestamp && (
              <span className="aegis-chat-msg__time">{timestamp}</span>
            )}
          </div>
        )}
        <div className="aegis-chat-msg__bubble">{content}</div>
        {footer && <div className="aegis-chat-msg__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default ChatMessage;
