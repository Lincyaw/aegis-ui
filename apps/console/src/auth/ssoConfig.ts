// Configuration for the OIDC code+PKCE flow against aegis-sso.
//
// Defaults assume dev: same-origin paths handled by vite's proxy in
// vite.config.ts. In prod, set VITE_SSO_ORIGIN to the absolute SSO URL.

export interface SsoConfig {
  origin: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export function loadSsoConfig(): SsoConfig {
  const origin = trimTrailingSlash(
    import.meta.env.VITE_SSO_ORIGIN ?? '',
  );
  const clientId = import.meta.env.VITE_SSO_CLIENT_ID ?? 'aegis-console';
  const redirectUri =
    import.meta.env.VITE_SSO_REDIRECT_URI ??
    `${window.location.origin}/auth/callback`;
  const scope = import.meta.env.VITE_SSO_SCOPE ?? 'openid profile email';
  return { origin, clientId, redirectUri, scope };
}

export function ssoUrl(path: string, cfg: SsoConfig): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return cfg.origin ? `${cfg.origin}${p}` : p;
}
