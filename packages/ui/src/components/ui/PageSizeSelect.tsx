import { type ReactElement, useId } from 'react';

import { Popover } from 'antd';

import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import './PageSizeSelect.css';

export interface PageSizeSelectProps {
  value: number;
  onChange: (next: number) => void;
  options?: number[];
  disabled?: boolean;
  label?: string;
  className?: string;
  /**
   * Preferred side for the options panel. Default is 'top' because the
   * primitive was originally used as a pagination footer where the table
   * content is above; use 'bottom' when the trigger sits at the top of a
   * section. The panel flips when the preferred side has no room.
   */
  placement?: 'top' | 'bottom';
}

const DEFAULT_OPTIONS: readonly number[] = [10, 20, 50, 100];

export function PageSizeSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS as number[],
  disabled = false,
  label = 'Rows per page',
  className,
  placement = 'top',
}: PageSizeSelectProps): ReactElement {
  const labelId = useId();
  const menu = useMenuPopover<HTMLUListElement>();

  const cls = ['aegis-page-size-select', className ?? '']
    .filter(Boolean)
    .join(' ');

  const pickOption = (next: number): void => {
    menu.close();
    if (next !== value) {
      onChange(next);
    }
  };

  const panel = (
    <ul
      ref={menu.panelRef}
      className="aegis-page-size-select__panel"
      role="listbox"
      tabIndex={-1}
      onKeyDown={menu.onPanelKeyDown}
    >
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <li key={opt} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={[
                'aegis-page-size-select__item',
                selected ? 'aegis-page-size-select__item--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                pickOption(opt);
              }}
            >
              <span className="aegis-page-size-select__item-value">{opt}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cls}>
      {label && (
        <span className="aegis-page-size-select__label" id={labelId}>
          {label}
        </span>
      )}
      <Popover
        content={panel}
        trigger="click"
        open={disabled ? false : menu.open}
        onOpenChange={menu.setOpen}
        placement={placement === 'top' ? 'topRight' : 'bottomRight'}
        autoAdjustOverflow={MENU_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-page-size-select__overlay' }}
        destroyOnHidden
      >
        <button
          ref={menu.triggerRef}
          type="button"
          className="aegis-page-size-select__trigger"
          aria-haspopup="listbox"
          aria-expanded={menu.open}
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? 'Page size' : undefined}
          disabled={disabled}
          onKeyDown={menu.onTriggerKeyDown}
        >
          <span className="aegis-page-size-select__value">{value}</span>
          <span className="aegis-page-size-select__caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </Popover>
    </div>
  );
}
