import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { Popover } from 'antd';

import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import { useStrings } from '../../locale';
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
  const strings = useStrings();
  const listId = useId();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');

  const selectRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

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

  // Up and Down move between the conversations' select buttons.
  const handleSelectKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number): void => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }
      event.preventDefault();
      const next = items[index + (event.key === 'ArrowDown' ? 1 : -1)] as
        | ChatSessionItem
        | undefined;
      if (next) {
        selectRefs.current.get(next.id)?.focus();
      }
    },
    [items],
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
    <ul className={cls} aria-label={strings.conversations}>
      {items.map((item, index) => {
        const isSelected = Boolean(item.selected);
        const isRenaming = renamingId === item.id;

        const rowCls = [
          'aegis-chat-session-list__row',
          `aegis-chat-session-list__row--${density}`,
          isSelected ? 'aegis-chat-session-list__row--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={item.id} className={rowCls}>
            {isRenaming ? (
              <div className="aegis-chat-session-list__main">
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
                  aria-label={strings.renameConversation}
                />
              </div>
            ) : (
              <button
                ref={(el) => {
                  selectRefs.current.set(item.id, el);
                }}
                type="button"
                className="aegis-chat-session-list__main"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  onSelect(item.id);
                }}
                onKeyDown={(event) => {
                  handleSelectKeyDown(event, index);
                }}
              >
                <span className="aegis-chat-session-list__title">
                  {item.title}
                </span>
                {item.timestamp !== undefined && (
                  <span className="aegis-chat-session-list__time">
                    {relativeTime(item.timestamp, strings)}
                  </span>
                )}
              </button>
            )}

            {(onRename ?? onDelete) && !isRenaming && (
              <RowActions
                menuId={`${listId}-menu-${item.id}`}
                title={item.title}
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
          </li>
        );
      })}
    </ul>
  );
}

interface RowActionsProps {
  menuId: string;
  /** The conversation's title, naming its menu button. */
  title: string;
  onRename?: () => void;
  onDelete?: () => void;
}

function RowActions({
  menuId,
  title,
  onRename,
  onDelete,
}: RowActionsProps): ReactElement {
  const strings = useStrings();
  const menu = useMenuPopover<HTMLDivElement>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (confirmingDelete) {
      confirmRef.current?.focus();
    }
  }, [confirmingDelete]);

  // React bubbles the portalled menu's events up to the host too; Escape in
  // the menu should close only the menu, not a dock around the list.
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
          {strings.rename}
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
              {strings.confirmDelete}
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
            {strings.delete}
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
          aria-label={strings.moreActionsFor(title)}
          aria-haspopup="menu"
          aria-expanded={menu.open}
          aria-controls={menu.open ? menuId : undefined}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (menu.open) {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                menu.close();
                return;
              }
            }
            menu.onTriggerKeyDown(event);
          }}
        >
          •••
        </button>
      </Popover>
    </div>
  );
}
