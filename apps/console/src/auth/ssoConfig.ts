// Configuration for the OIDC code+PKCE flow against aegis-sso.
//
// All endpoint values come from the runtime config layer (see
// src/config/runtime.ts) — no compile-time env. Empty origin means
// same-origin paths handled by vite's proxy in dev (and the gateway
// in same-host production).

import { getRuntimeConfig, ssoUrlFor } from '../config/runtime';

export interface SsoConfig {
  origin: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export function loadSsoConfig(): SsoConfig {
  const cfg = getRuntimeConfig();
  return {
    origin: cfg.ssoOrigin,
    clientId: cfg.ssoClientId,
    redirectUri: `${window.location.origin}/auth/callback`,
    scope: cfg.ssoScope,
  };
}

export function ssoUrl(path: string, _cfg: SsoConfig): string {
  return ssoUrlFor(path);
}
