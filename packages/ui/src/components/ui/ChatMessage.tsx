import { type ReactNode, useRef } from 'react';

import type { AgentMessageRole } from '../../agent/agentContext';
import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './ChatMessage.css';

export type ChatMessageSurface = PrimitiveSurface<{
  role: AgentMessageRole;
  content: ReactNode;
  timestamp?: string;
}>;

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
  const agentAttrs = usePrimitiveSurface(
    surface,
    { role, content, timestamp },
    'message',
    wrapRef,
  );
  const cls = ['aegis-chat-msg', `aegis-chat-msg--${role}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
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
