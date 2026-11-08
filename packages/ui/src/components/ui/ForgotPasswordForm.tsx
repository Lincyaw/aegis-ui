import { type FormEvent, type ReactElement, useState } from 'react';

import { Alert } from './Alert';
import { Button } from './Button';
import './ForgotPasswordForm.css';
import { TextField } from './TextField';
import { emailError } from './authValidation';

interface ForgotPasswordFormValues {
  email: string;
}

interface ForgotPasswordFormProps {
  /** Called only with a valid email address, trimmed. */
  onSubmit: (values: ForgotPasswordFormValues) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  success?: string;
}

export function ForgotPasswordForm({
  onSubmit,
  submitting = false,
  error,
  success,
}: ForgotPasswordFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmedEmail = email.trim();
  const fieldError = emailError(trimmedEmail);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSubmitted(true);
    if (fieldError !== undefined) {
      return;
    }
    void onSubmit({ email: trimmedEmail });
  };

  if (success) {
    return <Alert tone="success">{success}</Alert>;
  }

  return (
    <form className="aegis-forgotform" onSubmit={handleSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        required
        helperText="We'll send a reset link to this address."
        error={submitted ? fieldError : undefined}
      />
      <Button
        tone="primary"
        type="submit"
        className="aegis-forgotform__submit"
        disabled={submitting}
      >
        {submitting ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
