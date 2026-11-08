import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EllipsisOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { Popover } from 'antd';

import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import { usePopoverDialog } from '../../hooks/usePopoverDialog';
import type { SavedQuery } from '../../hooks/useSavedQueries';
import './SavedQueryBar.css';

export interface SavedQueryBarProps {
  /** In display order; pinned ones lead. `useSavedQueries` keeps them in localStorage. */
  queries: SavedQuery[];
  /** The current "live" query value to save when the user clicks Save. */
  currentValue: string;
  /** Called when the user picks a saved query — consumer applies it. */
  onApply: (q: SavedQuery) => void;
  /** Saves `value` under `name`. */
  onSave: (name: string, value: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
  /** When true, render a "Save current" affordance even if currentValue is empty (default false). */
  allowEmptySave?: boolean;
  /** Optional className. */
  className?: string;
  /** Max number of unpinned queries shown inline (default 6). The rest live in an overflow menu. */
  maxInlineUnpinned?: number;
}

export function SavedQueryBar({
  queries,
  currentValue,
  onApply,
  onSave,
  onRename,
  onRemove,
  onTogglePinned,
  allowEmptySave = false,
  className,
  maxInlineUnpinned = 6,
}: SavedQueryBarProps) {
  const { pinned, inlineUnpinned, overflow } = useMemo(() => {
    const pinnedQs = queries.filter((q) => q.pinned);
    const unpinnedQs = queries.filter((q) => !q.pinned);
    return {
      pinned: pinnedQs,
      inlineUnpinned: unpinnedQs.slice(0, maxInlineUnpinned),
      overflow: unpinnedQs.slice(maxInlineUnpinned),
    };
  }, [queries, maxInlineUnpinned]);

  const saveDisabled = !allowEmptySave && currentValue.trim() === '';
  const cls = ['aegis-sqb', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls} role="toolbar" aria-label="Saved queries">
      {queries.length === 0 ? (
        <span className="aegis-sqb__hint">
          No saved queries yet — save the current view to pin it.
        </span>
      ) : (
        <ul className="aegis-sqb__list">
          {pinned.map((q) => (
            <SavedQueryChip
              key={q.id}
              query={q}
              onApply={onApply}
              onRename={onRename}
              onRemove={onRemove}
              onTogglePinned={onTogglePinned}
            />
          ))}
          {inlineUnpinned.map((q) => (
            <SavedQueryChip
              key={q.id}
              query={q}
              onApply={onApply}
              onRename={onRename}
              onRemove={onRemove}
              onTogglePinned={onTogglePinned}
            />
          ))}
          {overflow.length > 0 ? (
            <OverflowMenu
              items={overflow}
              onApply={onApply}
              onRemove={onRemove}
              onTogglePinned={onTogglePinned}
            />
          ) : null}
        </ul>
      )}
      <SaveCurrentControl
        disabled={saveDisabled}
        currentValue={currentValue}
        onSave={(name) => {
          onSave(name, currentValue);
        }}
      />
    </div>
  );
}

interface SavedQueryChipProps {
  query: SavedQuery;
  onApply: (q: SavedQuery) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

function SavedQueryChip({
  query,
  onApply,
  onRename,
  onRemove,
  onTogglePinned,
}: SavedQueryChipProps) {
  const [renaming, setRenaming] = useState(false);
  const menu = useMenuPopover<HTMLDivElement>();
  const menuId = useId();

  const handleClick = (): void => {
    if (renaming) {
      return;
    }
    onApply(query);
  };

  const handleContextMenu = (event: MouseEvent<HTMLLIElement>): void => {
    event.preventDefault();
    menu.setOpen(true);
  };

  const menuPanel = (
    <ChipMenu
      panelRef={menu.panelRef}
      id={menuId}
      onKeyDown={menu.onPanelKeyDown}
      query={query}
      onRename={() => {
        menu.setOpen(false);
        setRenaming(true);
      }}
      onTogglePinned={() => {
        menu.close();
        onTogglePinned(query.id);
      }}
      onRemove={() => {
        menu.close();
        onRemove(query.id);
      }}
    />
  );

  return (
    <li className="aegis-sqb__item" onContextMenu={handleContextMenu}>
      {renaming ? (
        <RenameInput
          initialName={query.name}
          onSubmit={(name) => {
            onRename(query.id, name);
            setRenaming(false);
          }}
          onCancel={() => {
            setRenaming(false);
          }}
        />
      ) : (
        <>
          <button
            type="button"
            className="aegis-sqb__chip"
            onClick={handleClick}
            title={query.value}
          >
            {query.pinned ? (
              <StarFilled
                className="aegis-sqb__chip-star aegis-sqb__chip-star--on"
                aria-hidden
              />
            ) : null}
            <span className="aegis-sqb__chip-label">{query.name}</span>
          </button>
          <Popover
            content={menuPanel}
            trigger="click"
            open={menu.open}
            onOpenChange={menu.setOpen}
            placement="bottomRight"
            autoAdjustOverflow={MENU_OVERFLOW}
            arrow={false}
            classNames={{ root: 'aegis-sqb__popover' }}
            destroyOnHidden
          >
            <button
              ref={menu.triggerRef}
              type="button"
              className="aegis-sqb__menu-trigger"
              aria-label={`Options for ${query.name}`}
              aria-haspopup="menu"
              aria-expanded={menu.open}
              aria-controls={menu.open ? menuId : undefined}
              onKeyDown={menu.onTriggerKeyDown}
            >
              <EllipsisOutlined aria-hidden />
            </button>
          </Popover>
        </>
      )}
    </li>
  );
}

interface ChipMenuProps {
  panelRef: Ref<HTMLDivElement>;
  id: string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  query: SavedQuery;
  onRename: () => void;
  onTogglePinned: () => void;
  onRemove: () => void;
}

function ChipMenu({
  panelRef,
  id,
  onKeyDown,
  query,
  onRename,
  onTogglePinned,
  onRemove,
}: ChipMenuProps) {
  return (
    <div
      ref={panelRef}
      id={id}
      className="aegis-sqb__menu"
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        role="menuitem"
        className="aegis-sqb__menu-item"
        onClick={onRename}
      >
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        className="aegis-sqb__menu-item"
        onClick={onTogglePinned}
      >
        {query.pinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        type="button"
        role="menuitem"
        className="aegis-sqb__menu-item aegis-sqb__menu-item--danger"
        onClick={onRemove}
      >
        Delete
      </button>
    </div>
  );
}

interface RenameInputProps {
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function RenameInput({ initialName, onSubmit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initialName);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (value.trim() !== '') {
        onSubmit(value);
      } else {
        onCancel();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      className="aegis-sqb__rename-input"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (value.trim() !== '' && value !== initialName) {
          onSubmit(value);
        } else {
          onCancel();
        }
      }}
      aria-label="Rename saved query"
    />
  );
}

interface OverflowMenuProps {
  items: SavedQuery[];
  onApply: (q: SavedQuery) => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

function OverflowMenu({
  items,
  onApply,
  onRemove,
  onTogglePinned,
}: OverflowMenuProps) {
  const menu = useMenuPopover<HTMLDivElement>();
  const menuId = useId();
  const content = (
    <div
      ref={menu.panelRef}
      id={menuId}
      className="aegis-sqb__menu aegis-sqb__menu--overflow"
      role="menu"
      tabIndex={-1}
      onKeyDown={menu.onPanelKeyDown}
    >
      {items.map((q) => (
        <OverflowRow
          key={q.id}
          query={q}
          onApply={() => {
            menu.close();
            onApply(q);
          }}
          onRemove={onRemove}
          onTogglePinned={onTogglePinned}
        />
      ))}
    </div>
  );
  return (
    <li className="aegis-sqb__item">
      <Popover
        content={content}
        trigger="click"
        open={menu.open}
        onOpenChange={menu.setOpen}
        placement="bottomRight"
        autoAdjustOverflow={MENU_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-sqb__popover' }}
        destroyOnHidden
      >
        <button
          ref={menu.triggerRef}
          type="button"
          className="aegis-sqb__chip aegis-sqb__chip--ghost"
          aria-haspopup="menu"
          aria-expanded={menu.open}
          aria-controls={menu.open ? menuId : undefined}
          onKeyDown={menu.onTriggerKeyDown}
        >
          +{items.length.toString()} more
        </button>
      </Popover>
    </li>
  );
}

interface OverflowRowProps {
  query: SavedQuery;
  onApply: () => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

function OverflowRow({
  query,
  onApply,
  onRemove,
  onTogglePinned,
}: OverflowRowProps) {
  return (
    <div className="aegis-sqb__overflow-row">
      <button
        type="button"
        role="menuitem"
        className="aegis-sqb__menu-item aegis-sqb__overflow-apply"
        onClick={onApply}
        title={query.value}
      >
        {query.name}
      </button>
      <button
        type="button"
        className="aegis-sqb__overflow-icon"
        onClick={() => {
          onTogglePinned(query.id);
        }}
        aria-label={query.pinned ? 'Unpin' : 'Pin'}
      >
        {query.pinned ? (
          <StarFilled aria-hidden />
        ) : (
          <StarOutlined aria-hidden />
        )}
      </button>
      <button
        type="button"
        className="aegis-sqb__overflow-icon aegis-sqb__overflow-icon--danger"
        onClick={() => {
          onRemove(query.id);
        }}
        aria-label={`Delete ${query.name}`}
      >
        ×
      </button>
    </div>
  );
}

interface SaveCurrentControlProps {
  disabled: boolean;
  currentValue: string;
  onSave: (name: string) => void;
}

function SaveCurrentControl({
  disabled,
  currentValue,
  onSave,
}: SaveCurrentControlProps) {
  const popover = usePopoverDialog<HTMLFormElement>();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const formId = useId();
  const { open } = popover;

  useEffect(() => {
    if (open) {
      setName(currentValue.slice(0, 32));
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => {
        window.clearTimeout(id);
      };
    }
    return undefined;
  }, [open, currentValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (name.trim() === '') {
      return;
    }
    onSave(name);
    popover.close();
    setName('');
  };

  const content = (
    <form
      ref={popover.panelRef}
      id={formId}
      className="aegis-sqb__save-form"
      aria-label="Save the current query"
      tabIndex={-1}
      onSubmit={handleSubmit}
    >
      <label className="aegis-sqb__save-label" htmlFor={nameId}>
        Name this query
      </label>
      <input
        id={nameId}
        ref={inputRef}
        type="text"
        className="aegis-sqb__save-input"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        placeholder="e.g. failed runs last 24h"
      />
      <div className="aegis-sqb__save-actions">
        <button
          type="button"
          className="aegis-sqb__save-cancel"
          onClick={popover.close}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="aegis-sqb__save-submit"
          disabled={name.trim() === ''}
        >
          Save
        </button>
      </div>
    </form>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={disabled ? false : open}
      onOpenChange={popover.setOpen}
      placement="bottomRight"
      arrow={false}
      classNames={{ root: 'aegis-sqb__popover' }}
      destroyOnHidden
    >
      <button
        ref={popover.triggerRef}
        type="button"
        className="aegis-sqb__save-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? formId : undefined}
      >
        <PlusOutlined aria-hidden />
        <span>Save current</span>
      </button>
    </Popover>
  );
}
