import type { ReactElement } from 'react';

import { Popover } from 'antd';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
import { MENU_OVERFLOW, useMenuPopover } from '../../hooks/useMenuPopover';
import './EnvironmentSwitcher.css';

export type EnvironmentSwitcherBadge =
  | 'default'
  | 'info'
  | 'warning'
  | 'danger';

export interface EnvironmentSwitcherOption {
  id: string;
  label: string;
  badge?: EnvironmentSwitcherBadge;
  /** Optional secondary line (e.g. baseUrl) shown in the dropdown. */
  hint?: string;
  /** Optional aegis-ui agent action — fired when the env is selected. */
  action?: AegisAction<void, unknown>;
}

export interface EnvironmentSwitcherProps {
  options: EnvironmentSwitcherOption[];
  currentId: string;
  onChange: (id: string) => void;
  /** Hidden when there is ≤1 option. Default true. */
  hideWhenSingle?: boolean;
  className?: string;
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
}

/**
 * Compact environment dropdown shipped for the AegisShell top header.
 * Presentational + controlled — the shell wires it to the active app's
 * manifest state. Hidden when there is only one environment.
 */
export function EnvironmentSwitcher({
  options,
  currentId,
  onChange,
  hideWhenSingle = true,
  className,
  ariaLabel = 'Switch environment',
}: EnvironmentSwitcherProps): ReactElement | null {
  const menu = useMenuPopover<HTMLUListElement>();

  if (options.length === 0) {
    return null;
  }
  if (hideWhenSingle && options.length <= 1) {
    return null;
  }
  const current = options.find((o) => o.id === currentId) ?? options[0];

  const cls = ['aegis-env-switcher', className ?? ''].filter(Boolean).join(' ');

  const panel = (
    <ul
      ref={menu.panelRef}
      className="aegis-env-switcher__panel"
      role="listbox"
      tabIndex={-1}
      onKeyDown={menu.onPanelKeyDown}
    >
      {options.map((opt) => (
        <EnvironmentSwitcherItem
          key={opt.id}
          option={opt}
          selected={opt.id === currentId}
          onPick={() => {
            menu.close();
            if (opt.id !== currentId) {
              onChange(opt.id);
            }
          }}
        />
      ))}
    </ul>
  );

  return (
    <div className={cls}>
      <Popover
        content={panel}
        trigger="click"
        open={menu.open}
        onOpenChange={menu.setOpen}
        placement="bottomRight"
        autoAdjustOverflow={MENU_OVERFLOW}
        arrow={false}
        classNames={{ root: 'aegis-env-switcher__overlay' }}
        destroyOnHidden
      >
        <button
          ref={menu.triggerRef}
          type="button"
          className="aegis-env-switcher__trigger"
          aria-haspopup="listbox"
          aria-expanded={menu.open}
          aria-label={ariaLabel}
          onKeyDown={menu.onTriggerKeyDown}
        >
          <span
            className={`aegis-env-switcher__dot aegis-env-switcher__dot--${current.badge ?? 'default'}`}
            aria-hidden="true"
          />
          <span className="aegis-env-switcher__label">{current.label}</span>
          <span className="aegis-env-switcher__caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </Popover>
    </div>
  );
}

interface EnvironmentSwitcherItemProps {
  option: EnvironmentSwitcherOption;
  selected: boolean;
  onPick: () => void;
}

function EnvironmentSwitcherItem({
  option,
  selected,
  onPick,
}: EnvironmentSwitcherItemProps) {
  const bound = useAegisAction<void, unknown>(option.action);
  const handleClick = (): void => {
    onPick();
    if (option.action) {
      void bound.invoke();
    }
  };
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        className={[
          'aegis-env-switcher__item',
          selected ? 'aegis-env-switcher__item--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleClick}
        data-agent-action-id={option.action?.id}
      >
        <span
          className={`aegis-env-switcher__dot aegis-env-switcher__dot--${option.badge ?? 'default'}`}
          aria-hidden="true"
        />
        <span className="aegis-env-switcher__item-text">
          <span className="aegis-env-switcher__item-label">{option.label}</span>
          {option.hint && (
            <span className="aegis-env-switcher__item-hint">{option.hint}</span>
          )}
        </span>
      </button>
    </li>
  );
}
