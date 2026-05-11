import { type ReactElement, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout, RegisterForm, useAuth } from '@OperationsPAI/aegis-ui';

import { register } from '../../auth/demoAuthStore';

export function Register(): ReactElement {
  const { signIn } = useAuth();
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
      await register(values);
      await signIn?.({ email: values.email, password: values.password });
      navigate('/portal', { replace: true });
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
