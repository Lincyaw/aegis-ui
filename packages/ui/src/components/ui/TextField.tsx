import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useId,
} from 'react';

import './TextField.css';

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  label?: string;
  helperText?: ReactNode;
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? `aegis-tf-${reactId}`;
    const helpId = `${inputId}-help`;
    const hasError = Boolean(error);

    const rootCls = [
      'aegis-textfield',
      hasError ? 'aegis-textfield--error' : '',
      disabled ? 'aegis-textfield--disabled' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const message = hasError ? error : helperText;

    return (
      <div className={rootCls}>
        {label && (
          <label htmlFor={inputId} className="aegis-textfield__label">
            {label}
          </label>
        )}
        <div className="aegis-textfield__control">
          {leadingIcon && (
            <span className="aegis-textfield__icon aegis-textfield__icon--leading">
              {leadingIcon}
            </span>
          )}
          <input
            {...rest}
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={message ? helpId : undefined}
            className="aegis-textfield__input"
          />
          {trailingIcon && (
            <span className="aegis-textfield__icon aegis-textfield__icon--trailing">
              {trailingIcon}
            </span>
          )}
        </div>
        {message && (
          <div
            id={helpId}
            className={
              hasError
                ? 'aegis-textfield__message aegis-textfield__message--error'
                : 'aegis-textfield__message'
            }
            role={hasError ? 'alert' : undefined}
          >
            {message}
          </div>
        )}
      </div>
    );
  },
);

TextField.displayName = 'TextField';

export default TextField;
