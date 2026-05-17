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
  onSubmit?: (values: LoginFormValues) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  onForgotPassword?: () => void;
  showRememberMe?: boolean;
  // When set, the form submits natively to this URL so the browser's
  // password manager can detect the credential submission. onSubmit is
  // still invoked (without preventDefault) for caller-side bookkeeping.
  action?: string;
  method?: 'GET' | 'POST';
  // Extra hidden inputs co-submitted with username/password — e.g. PKCE
  // params for an SSO authorization endpoint.
  hiddenFields?: Record<string, string>;
}

export function LoginForm({
  onSubmit,
  submitting = false,
  error,
  onForgotPassword,
  showRememberMe = true,
  action,
  method = 'POST',
  hiddenFields,
}: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    if (!action) {
      e.preventDefault();
    }
    void onSubmit?.({ email, password, remember });
  };

  return (
    <form
      className="aegis-loginform"
      onSubmit={handleSubmit}
      action={action}
      method={action ? method : undefined}
      noValidate
    >
      {error && (
        <div className="aegis-loginform__error" role="alert">
          {error}
        </div>
      )}
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {/* readOnly (not disabled) while submitting: disabled inputs are excluded
          from native form submission per the HTML spec, which breaks the
          action-URL path (SSO/PKCE) since React flushes setSubmitting(true)
          synchronously inside the submit handler — the browser would then
          serialize the form with username/password missing. */}
      <TextField
        label="Email"
        type="email"
        name="username"
        autoComplete="username"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={submitting}
        required
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        readOnly={submitting}
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
