import { type ReactNode, useId } from 'react';

import './FormRow.css';

interface FormRowProps {
  label: string;
  description?: string;
  /**
   * Id of the one control the label names; put the same id on that
   * control. Inside an antd `Form.Item`, put it on the input, not on the
   * item. The description's id is then `${controlId}-description`; set
   * it as the control's `aria-describedby`. Without a controlId the row is
   * a group the label names and the description describes, for several
   * controls or a value that isn't a control.
   */
  controlId?: string;
  children: ReactNode;
  className?: string;
}

export function FormRow({
  label,
  description,
  controlId,
  children,
  className,
}: FormRowProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descriptionId = description
    ? `${controlId ?? baseId}-description`
    : undefined;
  const cls = ['aegis-form-row', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="aegis-form-row__label-group">
        {controlId ? (
          <label className="aegis-form-row__label" htmlFor={controlId}>
            {label}
          </label>
        ) : (
          <span id={labelId} className="aegis-form-row__label">
            {label}
          </span>
        )}
        {description && (
          <span id={descriptionId} className="aegis-form-row__description">
            {description}
          </span>
        )}
      </div>
      {controlId ? (
        <div className="aegis-form-row__control">{children}</div>
      ) : (
        <div
          className="aegis-form-row__control"
          role="group"
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
        >
          {children}
        </div>
      )}
    </div>
  );
}
