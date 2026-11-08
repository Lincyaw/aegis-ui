import { type ReactNode, useId } from 'react';

import './FormRow.css';

interface FormRowBaseProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

type FormRowProps = FormRowBaseProps &
  (
    | {
        /**
         * Id of the one control the label names; put the same id on that
         * control. Inside an antd `Form.Item`, put it on the input, not on
         * the item. The label's id is then `${controlId}-label` and the
         * description's `${controlId}-description`; set the description's
         * as the control's `aria-describedby`. Without a controlId the row
         * is a group the label names and the description describes, for
         * several controls or a value that isn't a control.
         */
        controlId: string;
        /**
         * How the label names the control. `'for'`, the default, renders a
         * `<label for={controlId}>`, for an input, select, textarea or
         * button. `'aria-labelledby'` is for a control a `<label>` cannot
         * name, such as a meter or a radio group: the label is plain text,
         * and the control takes `${controlId}-label` as its
         * `aria-labelledby`.
         */
        labelBy?: 'for' | 'aria-labelledby';
      }
    | { controlId?: undefined; labelBy?: never }
  );

export function FormRow({
  label,
  description,
  controlId,
  labelBy = 'for',
  children,
  className,
}: FormRowProps) {
  const baseId = useId();
  const labelId = `${controlId ?? baseId}-label`;
  const descriptionId = description
    ? `${controlId ?? baseId}-description`
    : undefined;
  const cls = ['aegis-form-row', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="aegis-form-row__label-group">
        {controlId && labelBy === 'for' ? (
          <label
            id={labelId}
            className="aegis-form-row__label"
            htmlFor={controlId}
          >
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
