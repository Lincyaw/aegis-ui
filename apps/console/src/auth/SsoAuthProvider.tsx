import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type AegisAuthUser,
  AuthProvider,
  type AuthContextValue,
  type AuthStatus,
} from '@OperationsPAI/aegis-ui';

import { randomUrlSafe, s256Challenge } from './pkce';
import { loadSsoConfig, ssoUrl } from './ssoConfig';
import {
  exchangeCode,
  fetchUserInfo,
  logoutSso,
  refreshTokens,
  type UserInfo,
} from './ssoClient';
import {
  readPending,
  readTokens,
  writePending,
  writeTokens,
  type PendingAuth,
  type TokenSet,
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

function tokensFromResponse(resp: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}): TokenSet {
  return {
    accessToken: resp.access_token,
    refreshToken: resp.refresh_token,
    expiresAt: Date.now() + resp.expires_in * 1000,
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
  const tokensRef = useRef<TokenSet | null>(null);

  const setTokens = useCallback((t: TokenSet | null): void => {
    tokensRef.current = t;
    writeTokens(t);
  }, []);

  const hydrate = useCallback(async (): Promise<void> => {
    const stored = readTokens();
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }
    tokensRef.current = stored;
    try {
      let access = stored.accessToken;
      if (stored.expiresAt - 30_000 < Date.now() && stored.refreshToken) {
        const refreshed = await refreshTokens(cfg, stored.refreshToken);
        const next = tokensFromResponse(refreshed);
        setTokens(next);
        access = next.accessToken;
      }
      const u = await fetchUserInfo(cfg, access);
      setUser(userInfoToAuthUser(u));
      setStatus('authenticated');
    } catch {
      setTokens(null);
      setStatus('unauthenticated');
    }
  }, [cfg, setTokens]);

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

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        scope: cfg.scope,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      window.location.assign(`${ssoUrl('/authorize', cfg)}?${params.toString()}`);
    },
    [cfg],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const t = tokensRef.current;
    setTokens(null);
    writePending(null);
    setUser(null);
    setStatus('unauthenticated');
    if (t?.refreshToken) {
      try {
        await logoutSso(cfg, t.refreshToken);
      } catch {
        // sign-out is best-effort; tokens are already cleared locally
      }
    }
  }, [cfg, setTokens]);

  // Exposed for the /auth/callback route to finish the exchange.
  const completeCallback = useCallback(
    async (code: string, returnedState: string): Promise<string> => {
      const pending = readPending();
      if (!pending || pending.state !== returnedState) {
        throw new Error('Auth state mismatch');
      }
      const tok = await exchangeCode(cfg, code, pending.codeVerifier);
      const next = tokensFromResponse(tok);
      setTokens(next);
      writePending(null);
      const u = await fetchUserInfo(cfg, next.accessToken);
      setUser(userInfoToAuthUser(u));
      setStatus('authenticated');
      return pending.redirectAfter;
    },
    [cfg, setTokens],
  );

  // Stash the completion callback on the context value so the Callback
  // page can pick it up via a tiny custom hook without re-deriving PKCE.
  const value = useMemo<AuthContextValue<AegisAuthUser>>(
    () => ({
      status,
      user,
      signIn,
      signOut,
    }),
    [status, user, signIn, signOut],
  );

  return (
    <AuthProvider value={value}>
      <CallbackBridge completeCallback={completeCallback}>
        {children}
      </CallbackBridge>
    </AuthProvider>
  );
}

// CallbackBridge exposes the OIDC code-exchange function via a window-scoped
// hook so the /auth/callback route can complete the flow without ripping
// the provider's internal state through context. The bridge re-renders
// each time the completion function identity changes.
interface CallbackBridgeProps {
  completeCallback: (code: string, state: string) => Promise<string>;
  children: ReactNode;
}
export interface SsoAuthHandle {
  complete: (code: string, state: string) => Promise<string>;
}
declare global {
  // Re-declared in window scope so /auth/callback can resolve at runtime.
  interface Window {
    __aegisSsoAuth?: SsoAuthHandle;
  }
}
function CallbackBridge({
  completeCallback,
  children,
}: CallbackBridgeProps): ReactElement {
  useEffect(() => {
    window.__aegisSsoAuth = { complete: completeCallback };
    return () => {
      if (window.__aegisSsoAuth?.complete === completeCallback) {
        window.__aegisSsoAuth = undefined;
      }
    };
  }, [completeCallback]);
  return children as ReactElement;
}
