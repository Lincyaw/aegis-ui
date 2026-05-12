import { type SsoConfig, ssoUrl } from './ssoConfig';

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

async function form(
  cfg: SsoConfig,
  path: string,
  body: Record<string, string>,
): Promise<Response> {
  const params = new URLSearchParams(body);
  return fetch(ssoUrl(path, cfg), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

export async function exchangeCode(
  cfg: SsoConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const res = await form(cfg, '/token', {
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
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await form(cfg, '/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
  });
  if (!res.ok) {
    throw new Error(`refresh failed (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserInfo(
  cfg: SsoConfig,
  accessToken: string,
): Promise<UserInfo> {
  const res = await fetch(ssoUrl('/userinfo', cfg), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed (${res.status})`);
  }
  return (await res.json()) as UserInfo;
}

export async function logoutSso(
  cfg: SsoConfig,
  refreshToken?: string,
): Promise<void> {
  await form(cfg, '/v1/logout', refreshToken ? { refresh_token: refreshToken } : {});
}

interface RegisterReq {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export async function registerUser(
  cfg: SsoConfig,
  req: RegisterReq,
): Promise<void> {
  const res = await fetch(ssoUrl('/api/v2/auth/register', cfg), {
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
