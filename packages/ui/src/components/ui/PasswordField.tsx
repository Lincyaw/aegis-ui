import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react';

import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

import './PasswordField.css';
import { TextField } from './TextField';

interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  label?: string;
  helperText?: ReactNode;
  error?: string;
  leadingIcon?: ReactNode;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);
    const toggle = (): void => {
      setVisible((v) => !v);
    };

    const trailing = (
      <button
        type="button"
        className="aegis-passwordfield__toggle"
        onClick={toggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={0}
      >
        {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      </button>
    );

    return (
      <TextField
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        trailingIcon={trailing}
      />
    );
  },
);

PasswordField.displayName = 'PasswordField';

export default PasswordField;
