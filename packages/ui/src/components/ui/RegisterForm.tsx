import { type FormEvent, type ReactElement, useState } from 'react';

import { Alert } from './Alert';
import { Button } from './Button';
import { PasswordField } from './PasswordField';
import './RegisterForm.css';
import { TextField } from './TextField';
import { emailError } from './authValidation';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

interface RegisterFormProps {
  /** Called only once every field is valid; `name` and `email` arrive trimmed. */
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
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const errors = {
    name: trimmedName === '' ? 'Enter your name.' : undefined,
    email: emailError(trimmedEmail),
    password:
      password.length < minPasswordLength
        ? `Password must be at least ${String(minPasswordLength)} characters.`
        : undefined,
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.name ?? errors.email ?? errors.password) {
      return;
    }
    void onSubmit({ name: trimmedName, email: trimmedEmail, password });
  };

  return (
    <form className="aegis-registerform" onSubmit={handleSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField
        label="Name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        required
        error={submitted ? errors.name : undefined}
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
        error={submitted ? errors.email : undefined}
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
        error={submitted ? errors.password : undefined}
      />
      <Button
        tone="primary"
        type="submit"
        className="aegis-registerform__submit"
        disabled={submitting}
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
