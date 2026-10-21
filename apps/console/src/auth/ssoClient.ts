import { ssoUrlFor } from '../config/runtime';

import type { SsoConfig } from './ssoConfig';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface UserInfo {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface OidcEndpoints {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

let cachedEndpoints: OidcEndpoints | null = null;

export async function discoverOidc(): Promise<OidcEndpoints> {
  if (cachedEndpoints) return cachedEndpoints;
  const res = await fetch(ssoUrlFor('/.well-known/openid-configuration'));
  if (!res.ok) {
    throw new Error(`OIDC discovery failed (${res.status})`);
  }
  const doc = (await res.json()) as OidcEndpoints;
  cachedEndpoints = doc;
  return doc;
}

async function formPost(
  url: string,
  body: Record<string, string>
): Promise<Response> {
  const params = new URLSearchParams(body);
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

export async function exchangeCode(
  cfg: SsoConfig,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const endpoints = await discoverOidc();
  const res = await formPost(endpoints.token_endpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: codeVerifier,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshTokens(
  cfg: SsoConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const endpoints = await discoverOidc();
  const res = await formPost(endpoints.token_endpoint, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
  });
  if (!res.ok) {
    throw new Error(`refresh failed (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const endpoints = await discoverOidc();
  const res = await fetch(endpoints.userinfo_endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed (${res.status})`);
  }
  return (await res.json()) as UserInfo;
}

export async function logoutSso(refreshToken?: string): Promise<void> {
  const endpoints = await discoverOidc();
  if (endpoints.end_session_endpoint) {
    await formPost(
      endpoints.end_session_endpoint,
      refreshToken ? { refresh_token: refreshToken } : {}
    );
  }
}

interface RegisterReq {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export async function registerUser(req: RegisterReq): Promise<void> {
  const res = await fetch(ssoUrlFor('/api/v2/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let msg = `register failed (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      msg = j.message ?? j.error ?? msg;
    } catch {
      // fall through with default msg
    }
    throw new Error(msg);
  }
}
