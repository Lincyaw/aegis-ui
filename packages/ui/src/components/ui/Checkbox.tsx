import { type ReactNode } from 'react';

import './Checkbox.css';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  /** Mixed state for a parent checkbox whose children are partially selected. */
  indeterminate?: boolean;
  disabled?: boolean;
  /** Accessible name for checkboxes whose label is not visible, e.g. row selectors. */
  ariaLabel?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  className,
}: CheckboxProps) {
  const cls = [
    'aegis-checkbox',
    disabled ? 'aegis-checkbox--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls}>
      <input
        type="checkbox"
        className="aegis-checkbox__input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        ref={(node) => {
          if (node) {
            node.indeterminate = indeterminate && !checked;
          }
        }}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="aegis-checkbox__box" aria-hidden="true" />
      {label !== undefined && (
        <span className="aegis-checkbox__label">{label}</span>
      )}
    </label>
  );
}
