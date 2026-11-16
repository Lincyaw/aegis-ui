import {
  type ReactNode,
  type TextareaHTMLAttributes,
  forwardRef,
  useId,
} from 'react';

import './TextArea.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: ReactNode;
  error?: string;
  /** Visible lines of text before the field scrolls; the viewer can drag it taller. Defaults to 4. */
  rows?: number;
}

/** A field for text of several lines, drawn as TextField draws a field of one. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      error,
      rows = 4,
      id,
      className,
      disabled,
      'aria-describedby': describedBy,
      ...rest
    },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? `aegis-ta-${reactId}`;
    const helpId = `${inputId}-help`;
    const hasError = Boolean(error);

    const rootCls = [
      'aegis-textarea',
      hasError ? 'aegis-textarea--error' : '',
      disabled ? 'aegis-textarea--disabled' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const message = hasError ? error : helperText;

    return (
      <div className={rootCls} data-aegis-field>
        {label && (
          <label htmlFor={inputId} className="aegis-textarea__label">
            {label}
          </label>
        )}
        <textarea
          {...rest}
          id={inputId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [describedBy, message ? helpId : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="aegis-textarea__input"
        />
        {message && (
          <div
            id={helpId}
            className={
              hasError
                ? 'aegis-textarea__message aegis-textarea__message--error'
                : 'aegis-textarea__message'
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

TextArea.displayName = 'TextArea';
