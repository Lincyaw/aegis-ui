import { type FormEvent, type ReactElement, useState } from 'react';

import { PasswordField } from './PasswordField';
import './RegisterForm.css';
import { TextField } from './TextField';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  minPasswordLength?: number;
}

export function RegisterForm({
  onSubmit,
  submitting = false,
  error,
  minPasswordLength = 8,
}: RegisterFormProps): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const passwordTooShort = password.length < minPasswordLength;
  const showPasswordError = touched && passwordTooShort;

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setTouched(true);
    if (passwordTooShort) {
      return;
    }
    void onSubmit({ name, email, password });
  };

  return (
    <form className="aegis-registerform" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="aegis-registerform__error" role="alert">
          {error}
        </div>
      )}
      <TextField
        label="Name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        required
      />
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
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        required
        helperText={`At least ${String(minPasswordLength)} characters.`}
        error={
          showPasswordError
            ? `Password must be at least ${String(minPasswordLength)} characters.`
            : undefined
        }
      />
      <button
        type="submit"
        className="aegis-registerform__submit"
        disabled={submitting}
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export default RegisterForm;
