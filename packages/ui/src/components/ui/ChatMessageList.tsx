import { Children, type ReactNode, useEffect, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './ChatMessageList.css';

export interface ChatMessageListSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (count: number) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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

  useAegisSurface<number>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'chat',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: childCount,
    project: surface ? surface.project : () => ({}),
    ref: scrollRef,
    enabled: Boolean(surface),
  });

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
    <div
      ref={scrollRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {header && <div className="aegis-chat-list__header">{header}</div>}
      <div className="aegis-chat-list__items">{children}</div>
      {footer && <div className="aegis-chat-list__footer">{footer}</div>}
    </div>
  );
}

export default ChatMessageList;
