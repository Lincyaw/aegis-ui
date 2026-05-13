/**
 * Backend connection settings for the Case Review sub-app.
 *
 * The sub-app owns its own backend URL — shell / vite proxy are not
 * involved. Users point this at any `llmharness serve` instance.
 *
 * Precedence: localStorage → VITE_LLMHARNESS_DEFAULT_URL → undefined.
 */

const STORAGE_KEY = 'aegis.llmharness.backend';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getBackendUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored.trim()) {
    return trimTrailingSlash(stored.trim());
  }
  const fromEnv = import.meta.env.VITE_LLMHARNESS_DEFAULT_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return trimTrailingSlash(fromEnv.trim());
  }
  return null;
}

export function setBackendUrl(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimTrailingSlash(url.trim()));
}

export function clearBackendUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export interface HealthInfo {
  root: string;
  caseCount: number;
  version: string;
}

interface HealthPayload {
  root: string;
  case_count: number;
  version: string;
}

export async function fetchHealth(url: string): Promise<HealthInfo> {
  const r = await fetch(`${trimTrailingSlash(url)}/api/health`);
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  const raw = (await r.json()) as HealthPayload;
  return { root: raw.root, caseCount: raw.case_count, version: raw.version };
}
