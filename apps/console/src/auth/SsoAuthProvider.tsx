import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AegisAuthUser,
  type AuthContextValue,
  AuthProvider,
  type AuthStatus,
} from '@lincyaw/aegis-ui';

import { randomUrlSafe, s256Challenge } from './pkce';
import {
  authFetch,
  clearSession,
  onSessionEnded,
  tokensFromResponse,
} from './session';
import { type SsoAuthHandle, SsoCallbackContext } from './ssoCallbackContext';
import {
  discoverOidc,
  exchangeCode,
  fetchUserInfo,
  logoutSso,
  type UserInfo,
} from './ssoClient';
import { loadSsoConfig } from './ssoConfig';
import {
  type PendingAuth,
  readPending,
  readTokens,
  writePending,
  writeTokens,
} from './tokenStore';

interface SignInArgs {
  redirectAfter?: string;
}

function userInfoToAuthUser(u: UserInfo): AegisAuthUser {
  return {
    id: u.sub,
    name: u.name ?? u.preferred_username ?? u.email ?? u.sub,
    email: u.email,
    avatar: u.picture,
  };
}

interface SsoAuthProviderProps {
  children: ReactNode;
}

export function SsoAuthProvider({
  children,
}: SsoAuthProviderProps): ReactElement {
  const cfg = useMemo(() => loadSsoConfig(), []);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AegisAuthUser | null>(null);

  useEffect(
    () =>
      onSessionEnded(() => {
        setUser(null);
        setStatus('unauthenticated');
      }),
    []
  );

  const hydrate = useCallback(async (): Promise<void> => {
    if (!readTokens()) {
      setStatus('unauthenticated');
      return;
    }
    try {
      const u = await fetchUserInfo(authFetch);
      setUser(userInfoToAuthUser(u));
      setStatus('authenticated');
    } catch (err) {
      // The stored tokens stay unless the token endpoint rejected them, so
      // a network or discovery outage does not cost the session.
      console.error('Could not restore the SSO session', err);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(
    async (credentials: unknown): Promise<void> => {
      const args = (credentials ?? {}) as SignInArgs;
      const verifier = randomUrlSafe(48);
      const challenge = await s256Challenge(verifier);
      const state = randomUrlSafe(16);
      const pending: PendingAuth = {
        state,
        codeVerifier: verifier,
        redirectAfter: args.redirectAfter ?? '/portal',
      };
      writePending(pending);

      const endpoints = await discoverOidc();
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        scope: cfg.scope,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      window.location.assign(
        `${endpoints.authorization_endpoint}?${params.toString()}`
      );
    },
    [cfg]
  );

  const signOut = useCallback(async (): Promise<void> => {
    const ending = clearSession();
    writePending(null);
    setUser(null);
    setStatus('unauthenticated');
    const refreshToken = await ending;
    if (refreshToken) {
      try {
        await logoutSso(refreshToken);
      } catch (err) {
        // The tokens are already cleared locally; the server-side session
        // lapses when its refresh token expires.
        console.error('Could not end the SSO session on the server', err);
      }
    }
  }, []);

  // Exposed for the /auth/callback route to finish the exchange.
  const completeCallback = useCallback(
    async (code: string, returnedState: string): Promise<string> => {
      const pending = readPending();
      if (!pending || pending.state !== returnedState) {
        throw new Error('Auth state mismatch');
      }
      const tok = await exchangeCode(cfg, code, pending.codeVerifier);
      writeTokens(tokensFromResponse(tok));
      writePending(null);
      const u = await fetchUserInfo(authFetch);
      setUser(userInfoToAuthUser(u));
      setStatus('authenticated');
      return pending.redirectAfter;
    },
    [cfg]
  );

  const value = useMemo<AuthContextValue<AegisAuthUser>>(
    () => ({
      status,
      user,
      signIn,
      signOut,
    }),
    [status, user, signIn, signOut]
  );
  const callbackHandle = useMemo<SsoAuthHandle>(
    () => ({ complete: completeCallback }),
    [completeCallback]
  );

  return (
    <AuthProvider value={value}>
      <SsoCallbackContext.Provider value={callbackHandle}>
        {children}
      </SsoCallbackContext.Provider>
    </AuthProvider>
  );
}
