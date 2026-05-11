import { type ReactElement, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout, ForgotPasswordForm } from '@OperationsPAI/aegis-ui';

import { requestPasswordReset } from '../../auth/demoAuthStore';

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
