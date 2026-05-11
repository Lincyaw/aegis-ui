import { Children, type ReactNode, useEffect, useRef } from 'react';

import './ChatMessageList.css';

interface ChatMessageListProps {
  children: ReactNode;
  /** Auto-scroll to bottom on children change. Default: true. */
  autoScroll?: boolean;
  /** Slot rendered before the messages (e.g. day header). */
  header?: ReactNode;
  /** Slot rendered after the last message (e.g. typing indicator). */
  footer?: ReactNode;
  className?: string;
}

export function ChatMessageList({
  children,
  autoScroll = true,
  header,
  footer,
  className,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  useEffect(() => {
    if (!autoScroll) {
      return;
    }
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [autoScroll, childCount, footer]);

  const cls = ['aegis-chat-list', className ?? ''].filter(Boolean).join(' ');

  return (
    <div ref={scrollRef} className={cls}>
      {header && <div className="aegis-chat-list__header">{header}</div>}
      <div className="aegis-chat-list__items">{children}</div>
      {footer && <div className="aegis-chat-list__footer">{footer}</div>}
    </div>
  );
}

export default ChatMessageList;
