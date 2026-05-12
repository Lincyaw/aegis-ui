import { type ReactElement, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout, ForgotPasswordForm } from '@lincyaw/aegis-ui';

// SSO has no password-reset endpoint yet; stub keeps the form working
// so the user gets the standard "if an account exists…" acknowledgement.
async function requestPasswordReset(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
}

export function ForgotPassword(): ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<string | undefined>(undefined);

  const handleSubmit = async (values: { email: string }): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSuccess(
        `If an account exists for ${values.email}, we've sent a reset link.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      brand='AegisLab'
      title='Reset your password'
      description='Enter your email and we&apos;ll send you a reset link.'
      footer={<Link to='/auth/login'>Back to sign in</Link>}
    >
      <ForgotPasswordForm
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        success={success}
      />
    </AuthLayout>
  );
}

export default ForgotPassword;
