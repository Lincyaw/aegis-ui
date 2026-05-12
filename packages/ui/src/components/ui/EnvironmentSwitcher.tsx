import { type ReactElement, useEffect, useRef, useState } from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  if (options.length === 0) {
    return null;
  }
  if (hideWhenSingle && options.length <= 1) {
    return null;
  }
  const current = options.find((o) => o.id === currentId) ?? options[0];

  const cls = ['aegis-env-switcher', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls} ref={ref}>
      <button
        type="button"
        className="aegis-env-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((v) => !v);
        }}
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
      {open && (
        <ul className="aegis-env-switcher__panel" role="listbox">
          {options.map((opt) => (
            <EnvironmentSwitcherItem
              key={opt.id}
              option={opt}
              selected={opt.id === currentId}
              onPick={() => {
                setOpen(false);
                if (opt.id !== currentId) {
                  onChange(opt.id);
                }
              }}
            />
          ))}
        </ul>
      )}
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

export default EnvironmentSwitcher;
