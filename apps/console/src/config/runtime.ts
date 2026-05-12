/**
 * Runtime endpoint configuration.
 *
 * Resolution order (later wins):
 *   1. Compile-time defaults (empty → same-origin via vite proxy in dev)
 *   2. window.__AEGIS_CONFIG__ injected by /config.js at page load
 *   3. localStorage override written from the in-app Setup page
 *
 * Empty string means "use same-origin / current relative path", which is
 * what dev wants (vite proxies the prefixes) and also what a co-located
 * production deployment wants (gateway serves the SPA + /api/* on the
 * same host). A user running the SPA locally against a remote gateway
 * fills in absolute URLs.
 */

export interface RuntimeConfig {
  /** Base URL for `/api/*`, `/v1/*`, `/.well-known/*`, etc. Empty = same origin. */
  gatewayUrl: string;
  /** Explicit SSO origin. Falls back to `gatewayUrl` when unset. */
  ssoOrigin: string;
  ssoClientId: string;
  ssoScope: string;
  /** ClickHouse HTTP endpoint, e.g. `http://localhost:8123`. Empty = use gateway proxy. */
  clickhouseUrl: string;
  clickhouseDatabase: string;
  clickhouseTracesTable: string;
  clickhouseUser?: string;
  clickhousePassword?: string;
}

declare global {
  interface Window {
    __AEGIS_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const LS_KEY = 'aegis.runtime.config.v1';

const DEFAULTS: RuntimeConfig = {
  gatewayUrl: '',
  ssoOrigin: '',
  ssoClientId: 'aegis-console',
  ssoScope: 'openid profile email',
  clickhouseUrl: '',
  clickhouseDatabase: 'otel',
  clickhouseTracesTable: 'otel_traces',
};

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function readLocalOverride(): Partial<RuntimeConfig> {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Partial<RuntimeConfig>;
  } catch {
    return {};
  }
}

function compose(): RuntimeConfig {
  const win = (typeof window !== 'undefined' && window.__AEGIS_CONFIG__) || {};
  const ls = readLocalOverride();
  const merged = { ...DEFAULTS, ...win, ...ls };
  const gateway = trimTrailingSlash(merged.gatewayUrl);
  return {
    ...merged,
    gatewayUrl: gateway,
    ssoOrigin: trimTrailingSlash(merged.ssoOrigin || gateway),
    clickhouseUrl: trimTrailingSlash(merged.clickhouseUrl),
  };
}

let cached: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (!cached) {
    cached = compose();
  }
  return cached;
}

export function setLocalOverride(patch: Partial<RuntimeConfig>): void {
  const cur = readLocalOverride();
  const next = { ...cur, ...patch };
  window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  cached = null;
}

export function clearLocalOverride(): void {
  window.localStorage.removeItem(LS_KEY);
  cached = null;
}

export function getLocalOverride(): Partial<RuntimeConfig> {
  return readLocalOverride();
}

/** Prefix a relative gateway path with the configured gateway origin. */
export function gatewayUrlFor(path: string): string {
  const { gatewayUrl } = getRuntimeConfig();
  if (!gatewayUrl) {
    return path;
  }
  return `${gatewayUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Prefix a relative SSO path with the configured SSO origin. */
export function ssoUrlFor(path: string): string {
  const { ssoOrigin } = getRuntimeConfig();
  if (!ssoOrigin) {
    return path;
  }
  return `${ssoOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** ClickHouse base — explicit URL when set, else dev proxy fallback. */
export function clickhouseBase(): string {
  const { clickhouseUrl } = getRuntimeConfig();
  return clickhouseUrl || '/api/v2/clickhouse';
}

/**
 * True when the user has a usable configuration. With same-origin
 * deployments this is always true (empty gateway = relative paths).
 * The Setup page checks this to know whether to nudge the user.
 */
export function isConfigured(): boolean {
  const cfg = getRuntimeConfig();
  return Boolean(cfg.gatewayUrl || cfg.clickhouseUrl) || isLikelyCoLocated();
}

function isLikelyCoLocated(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}
