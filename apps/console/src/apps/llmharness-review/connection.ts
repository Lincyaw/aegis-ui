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

/* ── Blob-backed roots ───────────────────────────────────────────────
 *
 * When set, the Case Review sub-app reads cases from the platform's
 * blob storage instead of (or in addition to) an external llmharness
 * backend / FS-Access local directory. Same `CaseRepo` contract — the
 * sub-app stays agnostic.
 *
 * The SFT root is stored separately from the cases root because SFT
 * bundles are produced independently and typically live in a sibling
 * prefix (e.g. `shared/sft-10case-2026-05-18/`).
 */

export interface BlobRoot {
  bucket: string;
  /** Directory prefix inside the bucket. Always normalised to end with '/'.
   *  Empty string means the root of the bucket. */
  prefix: string;
}

export interface BlobRootStore {
  get: () => BlobRoot | null;
  set: (root: BlobRoot) => void;
  clear: () => void;
}

function normaliseBlobPrefix(prefix: string): string {
  let p = prefix.trim().replace(/^\/+/, '');
  if (p && !p.endsWith('/')) {
    p = `${p}/`;
  }
  return p;
}

function createBlobRootStore(storageKey: string): BlobRootStore {
  return {
    get() {
      if (typeof window === 'undefined') {
        return null;
      }
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as Partial<BlobRoot>;
        if (typeof parsed.bucket !== 'string' || !parsed.bucket.trim()) {
          return null;
        }
        return {
          bucket: parsed.bucket.trim(),
          prefix: normaliseBlobPrefix(parsed.prefix ?? ''),
        };
      } catch {
        return null;
      }
    },
    set(root) {
      if (typeof window === 'undefined') {
        return;
      }
      const value: BlobRoot = {
        bucket: root.bucket.trim(),
        prefix: normaliseBlobPrefix(root.prefix),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    },
    clear() {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.removeItem(storageKey);
    },
  };
}

export const casesBlobRoot = createBlobRootStore('aegis.llmharness.blob');
export const sftBlobRoot = createBlobRootStore('aegis.llmharness.blob.sft');
