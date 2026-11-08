import { type FormEvent, type ReactElement, useState } from 'react';

import { Alert } from './Alert';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import './LoginForm.css';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';
import { EMAIL_REQUIRED } from './authValidation';

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  /** Called only once both fields are filled; `email` arrives trimmed. */
  onSubmit?: (values: LoginFormValues) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  onForgotPassword?: () => void;
  showRememberMe?: boolean;
  // When set, a filled-in form submits natively to this URL so the
  // browser's password manager can detect the credential submission.
  // onSubmit is still invoked (without preventDefault) for caller-side
  // bookkeeping.
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
  const [submitted, setSubmitted] = useState(false);

  const trimmedEmail = email.trim();
  const errors = {
    email: trimmedEmail === '' ? EMAIL_REQUIRED : undefined,
    password: password === '' ? 'Enter your password.' : undefined,
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    setSubmitted(true);
    if (errors.email ?? errors.password) {
      e.preventDefault();
      return;
    }
    if (!action) {
      e.preventDefault();
    }
    void onSubmit?.({ email: trimmedEmail, password, remember });
  };

  return (
    <form
      className="aegis-loginform"
      onSubmit={handleSubmit}
      action={action}
      method={action ? method : undefined}
      noValidate
    >
      {error && <Alert tone="error">{error}</Alert>}
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
        error={submitted ? errors.email : undefined}
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
        error={submitted ? errors.password : undefined}
      />
      {(showRememberMe || onForgotPassword) && (
        <div className="aegis-loginform__row">
          {showRememberMe ? (
            <Checkbox
              checked={remember}
              onChange={setRemember}
              disabled={submitting}
              label="Remember me"
            />
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
      <Button
        tone="primary"
        type="submit"
        className="aegis-loginform__submit"
        disabled={submitting}
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
