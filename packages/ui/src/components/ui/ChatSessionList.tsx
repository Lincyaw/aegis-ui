import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import './ChatSessionList.css';

export interface ChatSessionItem {
  id: string;
  title: string;
  /** Unix ms; the primitive will format it as relative time. */
  timestamp?: number;
  /** True for the currently selected row. */
  selected?: boolean;
}

export interface ChatSessionListProps {
  items: ChatSessionItem[];
  onSelect: (id: string) => void;
  onRename?: (id: string, nextTitle: string) => void;
  onDelete?: (id: string) => void;
  /** Visual density. Compact = dock popover; comfortable = full-page rail. */
  density?: 'compact' | 'comfortable';
  /** Empty-state slot. Default: nothing — host decides. */
  emptyState?: ReactNode;
  className?: string;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes.toString()} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours.toString()} 小时前`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days.toString()} 天前`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months.toString()} 月前`;
  }
  return `${Math.floor(months / 12).toString()} 年前`;
}

export function ChatSessionList({
  items,
  onSelect,
  onRename,
  onDelete,
  density = 'comfortable',
  emptyState,
  className,
}: ChatSessionListProps): ReactElement {
  const listId = useId();
  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.selected),
    [items],
  );
  const [focusIndex, setFocusIndex] = useState<number>(
    selectedIndex >= 0 ? selectedIndex : 0,
  );
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const containerRef = useRef<HTMLUListElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // Close menu / confirm / rename on outside click.
  useEffect(() => {
    if (!menuOpenId && !confirmDeleteId && !renamingId) {
      return undefined;
    }
    const onDocClick = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpenId(null);
        setConfirmDeleteId(null);
        setRenamingId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [menuOpenId, confirmDeleteId, renamingId]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Clamp focus when items change.
  useEffect(() => {
    if (focusIndex >= items.length && items.length > 0) {
      setFocusIndex(items.length - 1);
    }
  }, [items.length, focusIndex]);

  const commitRename = useCallback(
    (id: string): void => {
      const trimmed = renameDraft.trim();
      const target = items.find((it) => it.id === id);
      if (trimmed && target && trimmed !== target.title) {
        onRename?.(id, trimmed);
      }
      setRenamingId(null);
      setRenameDraft('');
    },
    [renameDraft, items, onRename],
  );

  const handleRowKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, index: number): void => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = Math.min(items.length - 1, index + 1);
        setFocusIndex(next);
        rowRefs.current.get(items[next].id)?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const next = Math.max(0, index - 1);
        setFocusIndex(next);
        rowRefs.current.get(items[next].id)?.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(items[index].id);
      }
    },
    [items, onSelect],
  );

  if (items.length === 0) {
    return (
      <div
        className={['aegis-chat-session-list__empty', className ?? '']
          .filter(Boolean)
          .join(' ')}
      >
        {emptyState ?? null}
      </div>
    );
  }

  const cls = ['aegis-chat-session-list', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <ul ref={containerRef} className={cls} role="listbox" aria-label="对话列表">
      {items.map((item, index) => {
        const isSelected = Boolean(item.selected);
        const isFocused = index === focusIndex;
        const isRenaming = renamingId === item.id;
        const isMenuOpen = menuOpenId === item.id;
        const isConfirmingDelete = confirmDeleteId === item.id;

        const rowCls = [
          'aegis-chat-session-list__row',
          `aegis-chat-session-list__row--${density}`,
          isSelected ? 'aegis-chat-session-list__row--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={item.id}>
            <div
              ref={(el) => {
                rowRefs.current.set(item.id, el);
              }}
              className={rowCls}
              role="option"
              aria-selected={isSelected}
              tabIndex={isFocused ? 0 : -1}
              onKeyDown={(event) => {
                if (isRenaming) {
                  return;
                }
                handleRowKeyDown(event, index);
              }}
              onFocus={() => {
                setFocusIndex(index);
              }}
            >
              {isRenaming ? (
                <div
                  className={`aegis-chat-session-list__main aegis-chat-session-list__main--${density}`}
                >
                  <input
                    ref={renameInputRef}
                    className="aegis-chat-session-list__rename"
                    value={renameDraft}
                    onChange={(event) => {
                      setRenameDraft(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitRename(item.id);
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setRenamingId(null);
                        setRenameDraft('');
                      }
                    }}
                    onBlur={() => {
                      commitRename(item.id);
                    }}
                    aria-label="重命名对话"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="aegis-chat-session-list__main"
                  onClick={() => {
                    onSelect(item.id);
                  }}
                  tabIndex={-1}
                >
                  <span className="aegis-chat-session-list__title">
                    {item.title}
                  </span>
                  {item.timestamp !== undefined && (
                    <span className="aegis-chat-session-list__time">
                      {relativeTime(item.timestamp)}
                    </span>
                  )}
                </button>
              )}

              {(onRename ?? onDelete) && !isRenaming && (
                <div className="aegis-chat-session-list__actions">
                  <button
                    type="button"
                    className="aegis-chat-session-list__more"
                    aria-label="更多操作"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    aria-controls={`${listId}-menu-${item.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpenId(isMenuOpen ? null : item.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    •••
                  </button>
                  {isMenuOpen && (
                    <div
                      id={`${listId}-menu-${item.id}`}
                      className="aegis-chat-session-list__menu"
                      role="menu"
                    >
                      {onRename && !isConfirmingDelete && (
                        <button
                          type="button"
                          role="menuitem"
                          className="aegis-chat-session-list__menu-item"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRenameDraft(item.title);
                            setRenamingId(item.id);
                            setMenuOpenId(null);
                          }}
                        >
                          重命名
                        </button>
                      )}
                      {onDelete &&
                        (isConfirmingDelete ? (
                          <span className="aegis-chat-session-list__confirm">
                            <button
                              type="button"
                              className="aegis-chat-session-list__confirm-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(item.id);
                                setConfirmDeleteId(null);
                                setMenuOpenId(null);
                              }}
                            >
                              确认?
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            role="menuitem"
                            className="aegis-chat-session-list__menu-item aegis-chat-session-list__menu-item--danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              setConfirmDeleteId(item.id);
                            }}
                          >
                            删除
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default ChatSessionList;
