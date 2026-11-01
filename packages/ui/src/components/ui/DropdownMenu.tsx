import type { ReactNode } from 'react';

import { Popover } from 'antd';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import './DropdownMenu.css';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Optional aegis-ui agent action — fired after onClick if not disabled. */
  action?: AegisAction<void, unknown>;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  /** Non-clickable content above `items`, before a divider — e.g. a search field. */
  header?: ReactNode;
  /** Rendered below `items`, after a divider — e.g. "View all" / "Create". */
  footerItems?: DropdownItem[];
  className?: string;
  align?: 'left' | 'right';
}

export function DropdownMenu({
  trigger,
  items,
  header,
  footerItems = [],
  className,
  align = 'right',
}: DropdownMenuProps) {
  const menu = useMenuPopover<HTMLDivElement>();

  const cls = ['aegis-dropdown', className ?? ''].filter(Boolean).join(' ');

  const panel = (
    <div
      ref={menu.panelRef}
      className="aegis-dropdown__panel"
      role="menu"
      tabIndex={-1}
      onKeyDown={menu.onPanelKeyDown}
    >
      {header && (
        <>
          <div className="aegis-dropdown__header">{header}</div>
          <div className="aegis-dropdown__divider" role="separator" />
        </>
      )}
      {items.map((item) => (
        <DropdownMenuItem
          key={item.key}
          item={item}
          onAfterClick={menu.close}
        />
      ))}
      {footerItems.length > 0 && (
        <>
          <div className="aegis-dropdown__divider" role="separator" />
          {footerItems.map((item) => (
            <DropdownMenuItem
              key={item.key}
              item={item}
              onAfterClick={menu.close}
            />
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className={cls}>
      <Popover
        content={panel}
        trigger="click"
        open={menu.open}
        onOpenChange={menu.setOpen}
        placement={align === 'left' ? 'bottomLeft' : 'bottomRight'}
        autoAdjustOverflow={MENU_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-dropdown__overlay' }}
        destroyOnHidden
      >
        <button
          ref={menu.triggerRef}
          type="button"
          className="aegis-dropdown__trigger"
          aria-haspopup="menu"
          aria-expanded={menu.open}
          onKeyDown={menu.onTriggerKeyDown}
        >
          {trigger}
        </button>
      </Popover>
    </div>
  );
}

interface DropdownMenuItemProps {
  item: DropdownItem;
  onAfterClick: () => void;
}

function DropdownMenuItem({ item, onAfterClick }: DropdownMenuItemProps) {
  const bound = useAegisAction<void, unknown>(item.action);
  const isUnavailable = item.action ? !bound.available : false;
  const disabled = item.disabled ?? isUnavailable;

  const handleClick = (): void => {
    if (disabled) {
      return;
    }
    item.onClick?.();
    if (item.action) {
      void bound.invoke();
    }
    onAfterClick();
  };

  return (
    <button
      type="button"
      role="menuitem"
      className={[
        'aegis-dropdown__item',
        item.danger ? 'aegis-dropdown__item--danger' : '',
        disabled ? 'aegis-dropdown__item--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      disabled={disabled}
      title={isUnavailable ? bound.unavailableReason : undefined}
      data-agent-action-id={item.action?.id}
    >
      {item.icon && (
        <span className="aegis-dropdown__item-icon">{item.icon}</span>
      )}
      <span className="aegis-dropdown__item-label">{item.label}</span>
    </button>
  );
}
