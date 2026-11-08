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

import { POPOVER_OVERFLOW } from '../../hooks/popoverOverflow';
import { useDialogPopover } from '../../hooks/useDialogPopover';
import { useMenuPopover } from '../../hooks/useMenuPopover';
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
  /** Max number of unpinned queries shown inline (default 6). The rest live in an overflow list. */
  maxInlineUnpinned?: number;
}

type FocusTarget =
  | { kind: 'query'; id: string; inOverflow: boolean }
  | { kind: 'save' };

function findQueryControl(
  container: ParentNode | null,
  id: string,
  selector: string,
): HTMLElement | null {
  const holder = Array.from(
    container?.querySelectorAll<HTMLElement>('[data-query-id]') ?? [],
  ).find((element) => element.dataset.queryId === id);
  return holder?.querySelector<HTMLElement>(selector) ?? null;
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
  const { inline, overflow } = useMemo(() => {
    const pinnedQs = queries.filter((q) => q.pinned);
    const unpinnedQs = queries.filter((q) => !q.pinned);
    return {
      inline: [...pinnedQs, ...unpinnedQs.slice(0, maxInlineUnpinned)],
      overflow: unpinnedQs.slice(maxInlineUnpinned),
    };
  }, [queries, maxInlineUnpinned]);

  const rootRef = useRef<HTMLDivElement>(null);
  const overflowPanelId = useId();
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  // A pin toggle moves a chip, a delete removes the control that had focus,
  // and a rename swaps its field back for the chip. Focus is placed once the
  // host's new queries have rendered.
  useEffect(() => {
    if (focusTarget === null) {
      return;
    }
    setFocusTarget(null);
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const chips = root.querySelectorAll<HTMLElement>('.aegis-sqb__chip');
    // The overflow list is searched only for a delete inside it, which keeps
    // it open; after a pin it is closing and may still hold the old row.
    const candidates =
      focusTarget.kind === 'query'
        ? [
            focusTarget.inOverflow
              ? findQueryControl(
                  document.getElementById(overflowPanelId),
                  focusTarget.id,
                  '.aegis-sqb__overflow-apply',
                )
              : null,
            findQueryControl(root, focusTarget.id, '.aegis-sqb__chip'),
            root.querySelector<HTMLElement>('.aegis-sqb__chip--ghost'),
            root.querySelector<HTMLButtonElement>('.aegis-sqb__save-trigger'),
          ]
        : [
            root.querySelector<HTMLButtonElement>('.aegis-sqb__save-trigger'),
            chips.length > 0 ? chips[chips.length - 1] : null,
          ];
    candidates
      .find(
        (element) =>
          element !== null &&
          !(element instanceof HTMLButtonElement && element.disabled),
      )
      ?.focus();
  }, [focusTarget, overflowPanelId]);

  const togglePinned = (id: string): void => {
    setFocusTarget({ kind: 'query', id, inOverflow: false });
    onTogglePinned(id);
  };

  // Focus moves to the next query, or to "Save current" after the last. In
  // the overflow list, which stays open, it moves back from the last row.
  const remove = (id: string): void => {
    const order = [...inline, ...overflow];
    const index = order.findIndex((q) => q.id === id);
    const inOverflow = index >= inline.length;
    let next: SavedQuery | undefined;
    if (index + 1 < order.length) {
      next = order[index + 1];
    } else if (inOverflow && overflow.length > 1) {
      next = order[index - 1];
    }
    setFocusTarget(
      next ? { kind: 'query', id: next.id, inOverflow } : { kind: 'save' },
    );
    onRemove(id);
  };

  const focusQuery = (id: string): void => {
    setFocusTarget({ kind: 'query', id, inOverflow: false });
  };

  const saveDisabled = !allowEmptySave && currentValue.trim() === '';
  const cls = ['aegis-sqb', className ?? ''].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={cls}
      role="toolbar"
      aria-label="Saved queries"
    >
      {queries.length === 0 ? (
        <span className="aegis-sqb__hint">
          No saved queries yet — save the current view to pin it.
        </span>
      ) : (
        <ul className="aegis-sqb__list">
          {inline.map((q) => (
            <SavedQueryChip
              key={q.id}
              query={q}
              onApply={onApply}
              onRename={onRename}
              onRenameDone={focusQuery}
              onRemove={remove}
              onTogglePinned={togglePinned}
            />
          ))}
          {overflow.length > 0 ? (
            <OverflowQueries
              panelId={overflowPanelId}
              items={overflow}
              onApply={onApply}
              onRemove={remove}
              onTogglePinned={togglePinned}
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
  /** Called when the user ends a rename from the keyboard. */
  onRenameDone: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

function SavedQueryChip({
  query,
  onApply,
  onRename,
  onRenameDone,
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

  // The bar places focus after Pin and Delete, once the chips have moved.
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
        menu.setOpen(false);
        onTogglePinned(query.id);
      }}
      onRemove={() => {
        menu.setOpen(false);
        onRemove(query.id);
      }}
    />
  );

  return (
    <li
      className="aegis-sqb__item"
      data-query-id={query.id}
      onContextMenu={handleContextMenu}
    >
      {renaming ? (
        <RenameInput
          initialName={query.name}
          onSubmit={(name, fromKeyboard) => {
            onRename(query.id, name);
            setRenaming(false);
            if (fromKeyboard) {
              onRenameDone(query.id);
            }
          }}
          onCancel={(fromKeyboard) => {
            setRenaming(false);
            if (fromKeyboard) {
              onRenameDone(query.id);
            }
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
            autoAdjustOverflow={POPOVER_OVERFLOW}
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
  onSubmit: (name: string, fromKeyboard: boolean) => void;
  onCancel: (fromKeyboard: boolean) => void;
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
        onSubmit(value, true);
      } else {
        onCancel(true);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel(true);
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
          onSubmit(value, false);
        } else {
          onCancel(false);
        }
      }}
      aria-label="Rename saved query"
    />
  );
}

interface OverflowQueriesProps {
  panelId: string;
  items: SavedQuery[];
  onApply: (q: SavedQuery) => void;
  onRemove: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

/**
 * The queries past `maxInlineUnpinned`, each with its own actions, in a
 * dialog popover. It stays open through a delete; a pinned query leaves it
 * for the bar, so a pin closes it.
 */
function OverflowQueries({
  panelId,
  items,
  onApply,
  onRemove,
  onTogglePinned,
}: OverflowQueriesProps) {
  const popover = useDialogPopover<HTMLDivElement>();
  const content = (
    // The dialog takes Escape and Tab for the controls inside it. The rule
    // allows that on <dialog> but cannot see role="dialog".
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={popover.panelRef}
      id={panelId}
      className="aegis-sqb__menu aegis-sqb__menu--overflow"
      role="dialog"
      aria-label="More saved queries"
      tabIndex={-1}
      onKeyDown={popover.onPanelKeyDown}
    >
      <ul className="aegis-sqb__overflow-list">
        {items.map((q) => (
          <OverflowRow
            key={q.id}
            query={q}
            onApply={() => {
              popover.close();
              onApply(q);
            }}
            onTogglePinned={() => {
              popover.setOpen(false);
              onTogglePinned(q.id);
            }}
            onRemove={() => {
              onRemove(q.id);
            }}
          />
        ))}
      </ul>
    </div>
  );
  return (
    <li className="aegis-sqb__item">
      <Popover
        content={content}
        trigger="click"
        open={popover.open}
        onOpenChange={popover.setOpen}
        placement="bottomRight"
        autoAdjustOverflow={POPOVER_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-sqb__popover' }}
        destroyOnHidden
      >
        <button
          ref={popover.triggerRef}
          type="button"
          className="aegis-sqb__chip aegis-sqb__chip--ghost"
          aria-haspopup="dialog"
          aria-expanded={popover.open}
          aria-controls={popover.open ? panelId : undefined}
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
  onTogglePinned: () => void;
  onRemove: () => void;
}

function OverflowRow({
  query,
  onApply,
  onTogglePinned,
  onRemove,
}: OverflowRowProps) {
  return (
    <li className="aegis-sqb__overflow-row" data-query-id={query.id}>
      <button
        type="button"
        className="aegis-sqb__menu-item aegis-sqb__overflow-apply"
        onClick={onApply}
        title={query.value}
      >
        {query.name}
      </button>
      <button
        type="button"
        className="aegis-sqb__overflow-icon"
        onClick={onTogglePinned}
        aria-label={`${query.pinned ? 'Unpin' : 'Pin'} ${query.name}`}
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
        onClick={onRemove}
        aria-label={`Delete ${query.name}`}
      >
        ×
      </button>
    </li>
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
  const popover = useDialogPopover<HTMLFormElement>();
  const [name, setName] = useState('');
  const nameId = useId();
  const formId = useId();
  const { open } = popover;

  const handleOpenChange = (next: boolean): void => {
    if (next) {
      setName(currentValue.slice(0, 32));
    }
    popover.setOpen(next);
  };

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
    // The dialog takes Escape and Tab for the controls inside it. The rule
    // allows that on <dialog> but cannot see role="dialog".
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <form
      ref={popover.panelRef}
      id={formId}
      className="aegis-sqb__save-form"
      role="dialog"
      aria-label="Save the current query"
      tabIndex={-1}
      onKeyDown={popover.onPanelKeyDown}
      onSubmit={handleSubmit}
    >
      <label className="aegis-sqb__save-label" htmlFor={nameId}>
        Name this query
      </label>
      {/* The popover focuses the field; selecting it lets typing replace
          the suggested name. */}
      <input
        id={nameId}
        type="text"
        className="aegis-sqb__save-input"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        onFocus={(e) => {
          e.currentTarget.select();
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
      onOpenChange={handleOpenChange}
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
