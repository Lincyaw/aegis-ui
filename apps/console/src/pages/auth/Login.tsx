import { type ReactElement, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout, LoginForm, useAuth } from '@OperationsPAI/aegis-ui';

interface LocationState {
  from?: { pathname?: string };
}

export function Login(): ReactElement {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const from =
    (location.state as LocationState | null)?.from?.pathname ?? '/portal';

  const handleSubmit = async (values: {
    email: string;
    password: string;
  }): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    try {
      await signIn?.({ email: values.email, password: values.password });
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      brand='AegisLab'
      title='Sign in'
      description='Welcome back. Sign in to your AegisLab console.'
      footer={
        <span>
          Don&apos;t have an account? <Link to='/auth/register'>Sign up</Link>
        </span>
      }
    >
      <LoginForm
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        onForgotPassword={() => navigate('/auth/forgot')}
      />
    </AuthLayout>
  );
}

export default Login;
