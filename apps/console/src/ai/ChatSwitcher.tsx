import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { type ChatSession, useChatStore } from './chatStore';
import './ChatSwitcher.css';

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} 天前`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} 月前`;
  }
  return `${Math.floor(months / 12)} 年前`;
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
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
    [switchChat],
  );

  const handleRename = useCallback(
    (session: ChatSession): void => {
      const next = window.prompt('重命名对话', session.title);
      if (next === null) {
        return;
      }
      const trimmed = next.trim();
      if (!trimmed) {
        return;
      }
      renameChat(session.id, trimmed);
    },
    [renameChat],
  );

  const handleDelete = useCallback(
    (session: ChatSession): void => {
      const ok = window.confirm(`确认删除对话 "${session.title}" 吗？`);
      if (!ok) {
        return;
      }
      deleteChat(session.id);
    },
    [deleteChat],
  );

  return (
    <div className='aegis-chat-switcher' ref={containerRef}>
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
            + 新建对话
          </button>
          <ul className='aegis-chat-switcher__list'>
            {sessions.map((session) => {
              const active = session.id === currentId;
              return (
                <li
                  key={session.id}
                  className={
                    active
                      ? 'aegis-chat-switcher__row aegis-chat-switcher__row--active'
                      : 'aegis-chat-switcher__row'
                  }
                >
                  <button
                    type='button'
                    className='aegis-chat-switcher__row-main'
                    onClick={() => {
                      handleSelect(session.id);
                    }}
                  >
                    <span className='aegis-chat-switcher__row-title'>
                      {truncate(session.title, 28)}
                    </span>
                    <span className='aegis-chat-switcher__row-time'>
                      {relativeTime(session.lastActiveAt)}
                    </span>
                  </button>
                  <ChatRowMenu
                    onRename={() => {
                      handleRename(session);
                    }}
                    onDelete={() => {
                      handleDelete(session);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ChatRowMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

function ChatRowMenu({ onRename, onDelete }: ChatRowMenuProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  return (
    <div className='aegis-chat-switcher__row-menu' ref={ref}>
      <button
        type='button'
        className='aegis-chat-switcher__row-more'
        aria-label='更多操作'
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        •••
      </button>
      {open && (
        <div className='aegis-chat-switcher__row-menu-popover' role='menu'>
          <button
            type='button'
            className='aegis-chat-switcher__row-menu-item'
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onRename();
            }}
          >
            重命名
          </button>
          <button
            type='button'
            className='aegis-chat-switcher__row-menu-item aegis-chat-switcher__row-menu-item--danger'
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
