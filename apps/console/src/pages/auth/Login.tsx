import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { AuthLayout, LoginForm, useAuth } from '@lincyaw/aegis-ui';

import { loadSsoConfig, ssoUrl } from '../../auth/ssoConfig';

interface LocationState {
  from?: { pathname?: string };
}

interface OidcHandoff {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

function readHandoff(params: URLSearchParams): OidcHandoff | null {
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const codeChallenge = params.get('code_challenge');
  if (!clientId || !redirectUri || !codeChallenge) {
    return null;
  }
  return {
    clientId,
    redirectUri,
    state: params.get('state') ?? '',
    scope: params.get('scope') ?? '',
    codeChallenge,
    codeChallengeMethod: params.get('code_challenge_method') ?? 'S256',
  };
}

export function Login(): ReactElement {
  const { signIn, status } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const handoff = readHandoff(params);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const triggered = useRef(false);

  useEffect(() => {
    if (handoff || triggered.current || status === 'authenticated') {
      return;
    }
    triggered.current = true;
    const from =
      (location.state as LocationState | null)?.from?.pathname ?? '/portal';
    void (async () => {
      try {
        await signIn?.({ redirectAfter: from });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign in failed');
        triggered.current = false;
      }
    })();
  }, [signIn, status, location.state, handoff]);

  if (!handoff) {
    return (
      <AuthLayout
        brand='AegisLab'
        title='Sign in'
        description='Redirecting to AegisLab SSO…'
      >
        {error ? <p role='alert'>{error}</p> : <p>Redirecting…</p>}
      </AuthLayout>
    );
  }

  const handleSubmit = (values: {
    email: string;
    password: string;
  }): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    const form = new URLSearchParams({
      client_id: handoff.clientId,
      redirect_uri: handoff.redirectUri,
      state: handoff.state,
      scope: handoff.scope,
      code_challenge: handoff.codeChallenge,
      code_challenge_method: handoff.codeChallengeMethod,
      username: values.email,
      password: values.password,
    });
    const action = ssoUrl('/login', loadSsoConfig());
    const el = document.createElement('form');
    el.method = 'POST';
    el.action = action;
    el.style.display = 'none';
    for (const [k, v] of form.entries()) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      el.appendChild(input);
    }
    document.body.appendChild(el);
    el.submit();
    return Promise.resolve();
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
      <LoginForm onSubmit={handleSubmit} submitting={submitting} error={error} />
    </AuthLayout>
  );
}

export default Login;
