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
  /** Id of the element that names the checkbox, e.g. its row's title. */
  ariaLabelledBy?: string;
  /** Lets a caller's `<label htmlFor>` point at the checkbox. */
  id?: string;
  /** Ids of the text that describes the checkbox, such as a FormRow's description. */
  'aria-describedby'?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  id,
  'aria-describedby': describedBy,
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
        id={id}
        className="aegis-checkbox__input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={describedBy}
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
