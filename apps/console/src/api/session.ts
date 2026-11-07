/**
 * The signed-in session's tokens. Every authenticated request (apiFetch,
 * the portal SDK's axios instance, the inbox stream and the SSO userinfo
 * call) takes its token from `getAccessToken` and hands a 401 to
 * `renewAfterUnauthorized`, so refreshing and ending the session happen
 * in one place.
 *
 * Tokens are cleared only when the token endpoint rejects the refresh
 * token. A network error or an OIDC discovery outage keeps them and fails
 * only the request that hit it.
 */
import {
  RefreshRejectedError,
  refreshTokens,
  type TokenResponse,
} from '../auth/ssoClient';
import { loadSsoConfig } from '../auth/ssoConfig';
import { readTokens, type TokenSet, writeTokens } from '../auth/tokenStore';

// Refresh this long before expiry so a token does not lapse in flight.
const EXPIRY_MARGIN_MS = 30_000;

let refreshing: Promise<TokenSet | null> | null = null;
const endedListeners = new Set<() => void>();

export function tokensFromResponse(
  resp: TokenResponse,
  previous?: TokenSet
): TokenSet {
  return {
    accessToken: resp.access_token,
    // Why: a token endpoint that does not rotate refresh tokens may omit
    // it from the refresh response; the old one is still valid.
    refreshToken: resp.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + resp.expires_in * 1000,
  };
}

/**
 * Called when the session can no longer authenticate requests: the refresh
 * token was rejected, or a rejected access token has none to renew it.
 */
export function onSessionEnded(listener: () => void): () => void {
  endedListeners.add(listener);
  return () => {
    endedListeners.delete(listener);
  };
}

function endSession(): void {
  for (const listener of endedListeners) {
    listener();
  }
}

async function renew(stale: TokenSet): Promise<TokenSet | null> {
  if (!stale.refreshToken) {
    endSession();
    return null;
  }
  try {
    const resp = await refreshTokens(loadSsoConfig(), stale.refreshToken);
    const next = tokensFromResponse(resp, stale);
    writeTokens(next);
    return next;
  } catch (err) {
    if (!(err instanceof RefreshRejectedError)) {
      throw err;
    }
    // Why: another tab may have rotated the refresh token while this
    // refresh was in flight, and its tokens are still good.
    const current = readTokens();
    if (current && current.refreshToken !== stale.refreshToken) {
      return current;
    }
    writeTokens(null);
    endSession();
    return null;
  }
}

function refresh(stale: TokenSet): Promise<TokenSet | null> {
  refreshing ??= renew(stale).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * The access token to send, refreshed first when it is about to expire.
 * Null when nobody is signed in.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens) {
    return null;
  }
  if (
    !tokens.refreshToken ||
    tokens.expiresAt - EXPIRY_MARGIN_MS > Date.now()
  ) {
    return tokens.accessToken;
  }
  const next = await refresh(tokens);
  return next?.accessToken ?? null;
}

/**
 * A request sent with `rejected` came back 401. Returns the token to retry
 * it with, once, or null when the session has ended.
 */
export async function renewAfterUnauthorized(
  rejected: string
): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens) {
    endSession();
    return null;
  }
  if (tokens.accessToken !== rejected) {
    return tokens.accessToken;
  }
  const next = await refresh(tokens);
  return next?.accessToken ?? null;
}
