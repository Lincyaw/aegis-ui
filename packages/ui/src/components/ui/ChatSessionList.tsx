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

import { Popover } from 'antd';

import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import './ChatSessionList.css';
import { relativeTime } from './relativeTime';

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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');

  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const renameInputRef = useRef<HTMLInputElement | null>(null);

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
    <ul className={cls} role="listbox" aria-label="Conversations">
      {items.map((item, index) => {
        const isSelected = Boolean(item.selected);
        const isFocused = index === focusIndex;
        const isRenaming = renamingId === item.id;

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
                    aria-label="Rename conversation"
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
                <RowActions
                  menuId={`${listId}-menu-${item.id}`}
                  onRename={
                    onRename
                      ? () => {
                          setRenameDraft(item.title);
                          setRenamingId(item.id);
                        }
                      : undefined
                  }
                  onDelete={
                    onDelete
                      ? () => {
                          onDelete(item.id);
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface RowActionsProps {
  menuId: string;
  onRename?: () => void;
  onDelete?: () => void;
}

function RowActions({
  menuId,
  onRename,
  onDelete,
}: RowActionsProps): ReactElement {
  const menu = useMenuPopover<HTMLDivElement>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (confirmingDelete) {
      confirmRef.current?.focus();
    }
  }, [confirmingDelete]);

  // The row's own arrow / Enter navigation must not see keys meant for the
  // menu; React bubbles the portalled panel's events through the row too.
  const panel = (
    <div
      ref={menu.panelRef}
      id={menuId}
      className="aegis-chat-session-list__menu"
      role="menu"
      tabIndex={-1}
      onKeyDown={(event) => {
        event.stopPropagation();
        menu.onPanelKeyDown(event);
      }}
    >
      {onRename && !confirmingDelete && (
        <button
          type="button"
          role="menuitem"
          className="aegis-chat-session-list__menu-item"
          onClick={() => {
            menu.setOpen(false);
            onRename();
          }}
        >
          Rename
        </button>
      )}
      {onDelete &&
        (confirmingDelete ? (
          <span className="aegis-chat-session-list__confirm">
            <button
              ref={confirmRef}
              type="button"
              className="aegis-chat-session-list__confirm-btn"
              onClick={() => {
                menu.setOpen(false);
                onDelete();
              }}
            >
              Confirm?
            </button>
          </span>
        ) : (
          <button
            type="button"
            role="menuitem"
            className="aegis-chat-session-list__menu-item aegis-chat-session-list__menu-item--danger"
            onClick={() => {
              setConfirmingDelete(true);
            }}
          >
            Delete
          </button>
        ))}
    </div>
  );

  return (
    <div className="aegis-chat-session-list__actions">
      <Popover
        content={panel}
        trigger="click"
        open={menu.open}
        onOpenChange={(next) => {
          if (next) {
            setConfirmingDelete(false);
          }
          menu.setOpen(next);
        }}
        placement="bottomRight"
        autoAdjustOverflow={MENU_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-chat-session-list__overlay' }}
        destroyOnHidden
      >
        <button
          ref={menu.triggerRef}
          type="button"
          className="aegis-chat-session-list__more"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menu.open}
          aria-controls={menuId}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            menu.onTriggerKeyDown(event);
          }}
        >
          •••
        </button>
      </Popover>
    </div>
  );
}
