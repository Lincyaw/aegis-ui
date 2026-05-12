import { type ReactElement, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout, RegisterForm } from '@OperationsPAI/aegis-ui';

import { registerUser } from '../../auth/ssoClient';
import { loadSsoConfig } from '../../auth/ssoConfig';

function deriveUsername(email: string): string {
  return email.split('@')[0]?.toLowerCase() || email.toLowerCase();
}

export function Register(): ReactElement {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    password: string;
  }): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    try {
      await registerUser(loadSsoConfig(), {
        username: deriveUsername(values.email),
        email: values.email,
        password: values.password,
        full_name: values.name,
      });
      navigate('/auth/login', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      brand='AegisLab'
      title='Create your account'
      description='Set up an AegisLab console account to get started.'
      footer={
        <span>
          Already have an account? <Link to='/auth/login'>Sign in</Link>
        </span>
      }
    >
      <RegisterForm
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </AuthLayout>
  );
}

export default Register;
