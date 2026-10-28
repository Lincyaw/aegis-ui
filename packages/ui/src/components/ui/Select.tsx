import { type ReactNode } from 'react';

import { CloseOutlined, DownOutlined } from '@ant-design/icons';

import { useStrings } from '../../locale';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Caption rendered above the control. */
  label?: ReactNode;
  /** Accessible name for a select shown without a visible caption, e.g. a compact filter. */
  ariaLabel?: string;
  /** Rendered as a disabled first option when `value` is empty. */
  placeholder?: string;
  /** Shows a clear control once a value is set. */
  allowClear?: boolean;
  disabled?: boolean;
  /** Lets a caller's `<label htmlFor>` point at the control. */
  id?: string;
  className?: string;
}

export function Select({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  placeholder,
  allowClear = false,
  disabled = false,
  id,
  className,
}: SelectProps) {
  const strings = useStrings();
  const clearable = allowClear && value !== '' && !disabled;
  const showsPlaceholder = placeholder !== undefined && value === '';
  const cls = [
    'aegis-select',
    clearable ? 'aegis-select--clearable' : '',
    showsPlaceholder ? 'aegis-select--placeholder' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {label !== undefined && (
        <span className="aegis-select__label">{label}</span>
      )}
      <div className="aegis-select__control">
        <select
          className="aegis-select__native"
          id={id}
          value={value}
          disabled={disabled}
          aria-label={
            ariaLabel ?? (typeof label === 'string' ? label : undefined)
          }
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <DownOutlined className="aegis-select__chevron" aria-hidden />
        {clearable && (
          <button
            type="button"
            className="aegis-select__clear"
            aria-label={strings.clearSelection}
            onClick={() => {
              onChange('');
            }}
          >
            <CloseOutlined aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
