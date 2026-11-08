import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type ChatSessionItem, ChatSessionList } from '@lincyaw/aegis-ui';
import { Popover } from 'antd';

import { useChatStore } from './chatStore';

import './ChatSwitcher.css';

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

export function ChatSwitcher(): ReactElement {
  const {
    sessions,
    currentId,
    currentChat,
    createChat,
    switchChat,
    renameChat,
    deleteChat,
  } = useChatStore();
  const [open, setOpen] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Why: preventDefault tells the dock this Escape is taken, so only the
  // popover closes.
  const closeOnEscape = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (!open || event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    },
    [open]
  );

  const handleCreate = useCallback((): void => {
    createChat();
    setOpen(false);
  }, [createChat]);

  const handleSelect = useCallback(
    (id: string): void => {
      switchChat(id);
      setOpen(false);
    },
    [switchChat]
  );

  const items = useMemo<ChatSessionItem[]>(
    () =>
      sessions.map((s) => ({
        id: s.id,
        title: s.title,
        timestamp: s.lastActiveAt,
        selected: s.id === currentId,
      })),
    [sessions, currentId]
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger='click'
      placement='bottomLeft'
      arrow={false}
      destroyOnHidden
      classNames={{ root: 'aegis-chat-switcher__overlay' }}
      content={
        <div
          className='aegis-chat-switcher__popover'
          role='menu'
          onKeyDown={closeOnEscape}
        >
          <button
            type='button'
            className='aegis-chat-switcher__new'
            onClick={handleCreate}
          >
            + New chat
          </button>
          <div className='aegis-chat-switcher__list'>
            <ChatSessionList
              density='compact'
              items={items}
              onSelect={handleSelect}
              onRename={renameChat}
              onDelete={deleteChat}
            />
          </div>
        </div>
      }
    >
      <button
        ref={triggerRef}
        type='button'
        className='aegis-chat-switcher__trigger'
        aria-haspopup='menu'
        aria-expanded={open}
        onKeyDown={closeOnEscape}
      >
        <span className='aegis-chat-switcher__title'>
          {truncate(currentChat.title, 24)}
        </span>
        <span aria-hidden='true' className='aegis-chat-switcher__caret'>
          ▾
        </span>
      </button>
    </Popover>
  );
}
