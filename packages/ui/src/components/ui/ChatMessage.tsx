import type { ReactNode } from 'react';

import type { AgentMessageRole } from '../../agent/agentContext';
import './ChatMessage.css';

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
}

export function ChatMessage({
  role,
  content,
  timestamp,
  avatar,
  senderName,
  footer,
  className,
}: ChatMessageProps) {
  const cls = ['aegis-chat-msg', `aegis-chat-msg--${role}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
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
