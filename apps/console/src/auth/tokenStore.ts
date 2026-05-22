// Tokens live in localStorage so login persists across tabs and survives
// tab close. PendingAuth (PKCE state) stays in sessionStorage because the
// OAuth round-trip is always single-tab and stale state from another tab
// would only cause callback mismatches.

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const TOKEN_KEY = 'aegis.console.sso.tokens';
const PENDING_KEY = 'aegis.console.sso.pending';

export interface PendingAuth {
  state: string;
  codeVerifier: string;
  redirectAfter: string;
}

export function readTokens(): TokenSet | null {
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TokenSet;
  } catch {
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function writeTokens(tokens: TokenSet | null): void {
  if (tokens) {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function readPending(): PendingAuth | null {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingAuth;
  } catch {
    window.sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
}

export function writePending(p: PendingAuth | null): void {
  if (p) {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } else {
    window.sessionStorage.removeItem(PENDING_KEY);
  }
}
