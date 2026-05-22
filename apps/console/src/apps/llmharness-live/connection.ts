/**
 * Connection settings for the Live Inspect sub-app.
 *
 * Source order (consumer side):
 *   1. ``?ws=`` URL query param (one-shot, never stored)
 *   2. localStorage key ``llmharness-live.ws-url``
 *   3. undefined → user must enter one on the Connection page
 *
 * A valid Live Inspect URL is a WebSocket URL of the form
 * ``ws[s]://host:port/inspect?root=<root_session_id>``. We only enforce
 * the scheme + presence of ``?root=``; everything else (path, query
 * keys) is the inspector's contract, not ours.
 */

const STORAGE_KEY = 'llmharness-live.ws-url';

export interface ValidationResult {
  ok: boolean;
  /** Human-readable reason when ``ok=false``. */
  reason?: string;
}

export function validateWsUrl(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: 'URL is empty' };
  }
  if (!/^wss?:\/\//i.test(trimmed)) {
    return { ok: false, reason: 'must start with ws:// or wss://' };
  }
  // ``new URL`` accepts ws/wss; we then require the ``root`` query param.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'not a valid URL' };
  }
  if (!parsed.searchParams.get('root')) {
    return { ok: false, reason: 'missing ?root=<root_session_id>' };
  }
  return { ok: true };
}

export function getStoredWsUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : null;
}

export function setStoredWsUrl(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, url.trim());
}

export function clearStoredWsUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Resolve the effective URL given the current location.search. URL
 * param wins; if it doesn't validate we fall through to storage.
 */
export function resolveInitialWsUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  const fromQuery = params.get('ws');
  if (fromQuery && validateWsUrl(fromQuery).ok) {
    return fromQuery;
  }
  return getStoredWsUrl();
}
