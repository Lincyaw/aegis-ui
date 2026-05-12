import { type ReactElement, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '@lincyaw/aegis-ui';

import { useSsoCallback } from '../../auth/ssoCallbackContext';

export function Callback(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | undefined>();
  const handle = useSsoCallback();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const oidcError = params.get('error');
    if (oidcError) {
      setError(params.get('error_description') ?? oidcError);
      return;
    }
    if (!code || !state) {
      setError('Missing code/state in callback');
      return;
    }
    void (async () => {
      try {
        const dest = await handle.complete(code, state);
        navigate(dest, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign in failed');
      }
    })();
  }, [params, navigate, handle]);

  return (
    <AuthLayout
      brand='AegisLab'
      title='Signing you in'
      description='Completing the SSO handshake…'
    >
      {error ? <p role='alert'>{error}</p> : <p>One moment…</p>}
    </AuthLayout>
  );
}

export default Callback;
