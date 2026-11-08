import { type ReactNode, useId } from 'react';

import { DownOutlined } from '@ant-design/icons';

import './PickerField.css';

interface PickerFieldBaseProps {
  /** Current choice; the placeholder shows while it is empty. */
  value?: ReactNode;
  placeholder?: ReactNode;
  /** Opens the picker, typically a Dialog. */
  onClick: () => void;
  disabled?: boolean;
  /** Ids of the text that describes the field, such as a FormRow's description. */
  'aria-describedby'?: string;
  className?: string;
}

type PickerFieldProps = PickerFieldBaseProps &
  (
    | {
        /** Caption rendered above the control, as on Select; it and the value name the field. */
        label: NonNullable<ReactNode>;
        ariaLabel?: never;
        'aria-labelledby'?: never;
      }
    | {
        /** Accessible name for a field shown without a caption. */
        ariaLabel: string;
        label?: never;
        'aria-labelledby'?: never;
      }
    | {
        /**
         * Id of visible text that names the field with its value, such as a
         * FormRow's label: give the row `labelBy='aria-labelledby'` and pass
         * `${controlId}-label`. A `<label for>` would replace the value in
         * the name.
         */
        'aria-labelledby': string;
        label?: never;
        ariaLabel?: never;
      }
  );

/** Looks like a closed Select but opens a dialog instead of a native menu. */
export function PickerField({
  label,
  value,
  placeholder,
  onClick,
  disabled = false,
  ariaLabel,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  className,
}: PickerFieldProps) {
  const labelId = useId();
  const controlId = useId();
  const empty = value === undefined || value === null || value === '';
  const nameId = labelledBy ?? (label !== undefined ? labelId : undefined);
  const cls = ['aegis-picker-field', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {label !== undefined && (
        <span id={labelId} className="aegis-picker-field__label">
          {label}
        </span>
      )}
      <button
        id={controlId}
        type="button"
        className="aegis-picker-field__control"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        aria-labelledby={
          nameId === undefined ? undefined : `${nameId} ${controlId}`
        }
        aria-describedby={describedBy}
        onClick={onClick}
      >
        <span
          className={
            empty
              ? 'aegis-picker-field__value aegis-picker-field__value--placeholder'
              : 'aegis-picker-field__value'
          }
        >
          {empty ? placeholder : value}
        </span>
        <DownOutlined className="aegis-picker-field__chevron" aria-hidden />
      </button>
    </div>
  );
}
