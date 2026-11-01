import { Children, type ReactNode, useEffect, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './ChatMessageList.css';

export type ChatMessageListSurface = PrimitiveSurface<number>;

interface ChatMessageListProps {
  children: ReactNode;
  /** Auto-scroll to bottom on children change. Default: true. */
  autoScroll?: boolean;
  /** Slot rendered before the messages (e.g. day header). */
  header?: ReactNode;
  /** Slot rendered after the last message (e.g. typing indicator). */
  footer?: ReactNode;
  className?: string;
  surface?: ChatMessageListSurface;
}

export function ChatMessageList({
  children,
  autoScroll = true,
  header,
  footer,
  className,
  surface,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  const agentAttrs = usePrimitiveSurface(
    surface,
    childCount,
    'chat',
    scrollRef,
  );

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
    <div ref={scrollRef} className={cls} {...agentAttrs}>
      {header && <div className="aegis-chat-list__header">{header}</div>}
      <div className="aegis-chat-list__items">{children}</div>
      {footer && <div className="aegis-chat-list__footer">{footer}</div>}
    </div>
  );
}
