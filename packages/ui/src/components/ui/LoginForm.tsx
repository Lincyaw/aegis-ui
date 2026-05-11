import { type FormEvent, type ReactElement, useState } from 'react';

import './LoginForm.css';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  onForgotPassword?: () => void;
  showRememberMe?: boolean;
}

export function LoginForm({
  onSubmit,
  submitting = false,
  error,
  onForgotPassword,
  showRememberMe = true,
}: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void onSubmit({ email, password, remember });
  };

  return (
    <form className="aegis-loginform" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="aegis-loginform__error" role="alert">
          {error}
        </div>
      )}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        required
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        required
      />
      {(showRememberMe || onForgotPassword) && (
        <div className="aegis-loginform__row">
          {showRememberMe ? (
            <label className="aegis-loginform__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={submitting}
              />
              <span>Remember me</span>
            </label>
          ) : (
            <span />
          )}
          {onForgotPassword && (
            <button
              type="button"
              className="aegis-loginform__forgot"
              onClick={onForgotPassword}
              disabled={submitting}
            >
              Forgot password?
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        className="aegis-loginform__submit"
        disabled={submitting}
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default LoginForm;
