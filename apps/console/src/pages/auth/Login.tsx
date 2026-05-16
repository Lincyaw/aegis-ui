import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { AuthLayout, LoginForm, useAuth } from '@lincyaw/aegis-ui';

import { loadSsoConfig, ssoUrl } from '../../auth/ssoConfig';

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

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

// Mirrors backend `consts.LoginError*` (aegislab/src/platform/consts/oidc.go).
// Keep in sync — error codes are part of the SSO contract.
export const SsoErrorCode = {
  InvalidCredentials: 'invalid_credentials',
  UnsupportedResponseType: 'unsupported_response_type',
  UnknownClient: 'unknown_client',
  ClientNotConfigured: 'client_not_configured',
  InvalidRedirectURI: 'invalid_redirect_uri',
  InvalidClientOrRedirect: 'invalid_client_or_redirect',
  PKCERequired: 'pkce_required',
  UnsupportedPKCEMethod: 'unsupported_pkce_method',
  Internal: 'internal_error',
} as const;

const SSO_ERROR_MESSAGES: Record<string, string> = {
  [SsoErrorCode.InvalidCredentials]:
    'Incorrect username or password. Please try again.',
  [SsoErrorCode.UnsupportedResponseType]:
    'This sign-in flow is not supported by the server.',
  [SsoErrorCode.UnknownClient]: 'Unknown client. Contact your administrator.',
  [SsoErrorCode.ClientNotConfigured]:
    'This client is not configured for sign-in. Contact your administrator.',
  [SsoErrorCode.InvalidRedirectURI]:
    'The redirect URL is not allowed for this client.',
  [SsoErrorCode.InvalidClientOrRedirect]:
    'Invalid client or redirect URL. Contact your administrator.',
  [SsoErrorCode.PKCERequired]:
    'This client requires PKCE. Reload the sign-in page.',
  [SsoErrorCode.UnsupportedPKCEMethod]: 'Unsupported PKCE method.',
  [SsoErrorCode.Internal]:
    'Something went wrong on our side. Please try again.',
};

function ssoErrorMessage(code: string | null): string | undefined {
  if (!code) return undefined;
  return SSO_ERROR_MESSAGES[code] ?? `Sign in failed (${code}).`;
}

export function Login(): ReactElement {
  const { signIn, status } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const handoff = readHandoff(params);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(() =>
    ssoErrorMessage(params.get('error'))
  );
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

  const handleSubmit = (_values: LoginFormValues): void => {
    // Native form POST handles the redirect; just flip UI state so the
    // button shows "Signing in…" until the browser navigates away.
    setError(undefined);
    setSubmitting(true);
  };

  const action = ssoUrl('/login', loadSsoConfig());

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
        action={action}
        method='POST'
        hiddenFields={{
          client_id: handoff.clientId,
          redirect_uri: handoff.redirectUri,
          state: handoff.state,
          scope: handoff.scope,
          code_challenge: handoff.codeChallenge,
          code_challenge_method: handoff.codeChallengeMethod,
        }}
      />
    </AuthLayout>
  );
}

export default Login;
