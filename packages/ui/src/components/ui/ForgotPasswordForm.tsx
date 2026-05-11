import { type FormEvent, type ReactElement, useState } from 'react';

import './ForgotPasswordForm.css';
import { TextField } from './TextField';

interface ForgotPasswordFormValues {
  email: string;
}

interface ForgotPasswordFormProps {
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void onSubmit({ email });
  };

  if (success) {
    return (
      <div className="aegis-forgotform__success" role="status">
        {success}
      </div>
    );
  }

  return (
    <form className="aegis-forgotform" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="aegis-forgotform__error" role="alert">
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
        helperText="We'll send a reset link to this address."
      />
      <button
        type="submit"
        className="aegis-forgotform__submit"
        disabled={submitting}
      >
        {submitting ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

export default ForgotPasswordForm;
