import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type ChatSessionItem, ChatSessionList } from '@lincyaw/aegis-ui';

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
  // Set by the container's React onMouseDown, which (unlike a DOM contains
  // check) also fires for presses in the session list's portalled row menu.
  const pressedInsideRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    pressedInsideRef.current = false;
    const onDocClick = (): void => {
      if (pressedInsideRef.current) {
        pressedInsideRef.current = false;
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
    <div
      className='aegis-chat-switcher'
      onMouseDown={() => {
        pressedInsideRef.current = true;
      }}
    >
      <button
        type='button'
        className='aegis-chat-switcher__trigger'
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span className='aegis-chat-switcher__title'>
          {truncate(currentChat.title, 24)}
        </span>
        <span aria-hidden='true' className='aegis-chat-switcher__caret'>
          ▾
        </span>
      </button>
      {open && (
        <div className='aegis-chat-switcher__popover' role='menu'>
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
      )}
    </div>
  );
}
