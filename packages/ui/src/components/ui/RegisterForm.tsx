import { type FormEvent, type ReactElement, useState } from 'react';

import { useStrings } from '../../locale';
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
  const strings = useStrings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const errors = {
    name: trimmedName === '' ? strings.authNameRequired : undefined,
    email: emailError(trimmedEmail, strings),
    password:
      password.length < minPasswordLength
        ? strings.authPasswordTooShort(minPasswordLength)
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
        label={strings.authName}
        autoComplete="name"
        placeholder={strings.authNamePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        required
        error={submitted ? errors.name : undefined}
      />
      <TextField
        label={strings.authEmail}
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
        label={strings.authPassword}
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        required
        helperText={strings.authPasswordHint(minPasswordLength)}
        error={submitted ? errors.password : undefined}
      />
      <Button
        tone="primary"
        type="submit"
        className="aegis-registerform__submit"
        disabled={submitting}
      >
        {submitting ? strings.authCreatingAccount : strings.authCreateAccount}
      </Button>
    </form>
  );
}
