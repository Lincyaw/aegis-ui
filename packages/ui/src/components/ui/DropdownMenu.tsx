import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
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
  className?: string;
  align?: 'left' | 'right';
}

export function DropdownMenu({
  trigger,
  items,
  className,
  align = 'right',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const cls = ['aegis-dropdown', className ?? ''].filter(Boolean).join(' ');

  const panelCls = [
    'aegis-dropdown__panel',
    `aegis-dropdown__panel--${align}`,
    open ? 'aegis-dropdown__panel--open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} ref={ref}>
      <button
        type="button"
        className="aegis-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {trigger}
      </button>
      <div className={panelCls}>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            item={item}
            onAfterClick={() => setOpen(false)}
          />
        ))}
      </div>
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

export default DropdownMenu;
