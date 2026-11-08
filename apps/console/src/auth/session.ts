/**
 * The signed-in session's tokens. Every authenticated request (apiFetch,
 * the portal SDK's axios instance, the inbox stream and the SSO userinfo
 * call) takes its token from `getAccessToken` and hands a 401 to
 * `renewAfterUnauthorized`, so refreshing and ending the session happen
 * in one place.
 *
 * localStorage is the one record of the session, shared by every tab:
 * tokens a refresh brings back are kept only while the stored tokens are
 * still the ones it redeemed, and the session ends in this tab when
 * another tab removes them.
 *
 * Tokens are cleared only when the token endpoint rejects the refresh
 * token. A network error or an OIDC discovery outage keeps them and fails
 * only the request that hit it.
 */
import {
  RefreshRejectedError,
  refreshTokens,
  type TokenResponse,
} from './ssoClient';
import { loadSsoConfig } from './ssoConfig';
import {
  onTokensRemovedElsewhere,
  readTokens,
  type TokenSet,
  writeTokens,
} from './tokenStore';

// Refresh this long before expiry so a token does not lapse in flight.
const EXPIRY_MARGIN_MS = 30_000;

interface Refresh {
  /** The refresh token being redeemed. */
  from: string;
  /** The tokens the server issued for it; null when it rejected it. */
  issued: Promise<TokenSet | null>;
}

let inFlight: Refresh | null = null;
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
 * token was rejected, a rejected access token has none to renew it, or
 * another tab signed out.
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

onTokensRemovedElsewhere(endSession);

function stillStored(refreshToken: string): boolean {
  return readTokens()?.refreshToken === refreshToken;
}

async function redeem(
  stale: TokenSet,
  refreshToken: string
): Promise<TokenSet | null> {
  try {
    const resp = await refreshTokens(loadSsoConfig(), refreshToken);
    const next = tokensFromResponse(resp, stale);
    // Why: the user may have signed out, or another tab rotated the
    // tokens, while this refresh was in flight.
    if (stillStored(refreshToken)) {
      writeTokens(next);
    }
    return next;
  } catch (err) {
    if (!(err instanceof RefreshRejectedError)) {
      throw err;
    }
    if (stillStored(refreshToken)) {
      writeTokens(null);
      endSession();
    }
    return null;
  }
}

/** Renews `stale` and returns the access token stored afterwards, if any. */
async function refresh(stale: TokenSet): Promise<string | null> {
  if (!stale.refreshToken) {
    endSession();
    return null;
  }
  inFlight ??= {
    from: stale.refreshToken,
    issued: redeem(stale, stale.refreshToken).finally(() => {
      inFlight = null;
    }),
  };
  await inFlight.issued;
  return readTokens()?.accessToken ?? null;
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
  return refresh(tokens);
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
  return refresh(tokens);
}

/**
 * A request sent without a token came back 401: no session can be stored,
 * whatever this tab still shows.
 */
export function unauthorizedWithoutToken(): void {
  endSession();
}

/**
 * Clears the stored tokens and resolves to the refresh token the server
 * should end. While a refresh of the stored token is in flight, that is
 * the token the refresh is issued: redeeming the stored one retires it.
 */
export async function clearSession(): Promise<string | undefined> {
  const stored = readTokens()?.refreshToken;
  const pending = inFlight && inFlight.from === stored ? inFlight : null;
  writeTokens(null);
  if (!pending) {
    return stored;
  }
  try {
    const issued = await pending.issued;
    return issued?.refreshToken;
  } catch {
    // Why: the refresh never reached a verdict, so the stored token is
    // still the live one; the request that started it reports the error.
    return stored;
  }
}

/**
 * `fetch` with the session's access token. On a 401 the token is renewed
 * once and the request retried.
 */
export async function authFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const send = (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  };
  const token = await getAccessToken();
  const res = await send(token);
  if (res.status !== 401) {
    return res;
  }
  if (!token) {
    unauthorizedWithoutToken();
    return res;
  }
  const renewed = await renewAfterUnauthorized(token);
  return renewed ? send(renewed) : res;
}
