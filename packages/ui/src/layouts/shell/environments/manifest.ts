import type {
  EnvironmentBadge,
  EnvironmentDescriptor,
  EnvironmentManifest,
} from './types';

const VALID_BADGES: ReadonlySet<EnvironmentBadge> = new Set([
  'default',
  'info',
  'warning',
  'danger',
]);

interface CacheEntry {
  fetchedAt: number;
  manifest: EnvironmentManifest;
  etag: string | null;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<EnvironmentManifest | null>>();

export interface ManifestFetchOptions {
  apiBaseUrl: string;
  discoveryPath: string;
  signal?: AbortSignal;
  /** Skip cache + force a network round-trip (revalidates with ETag if known). */
  force?: boolean;
}

/** Compose the URL the way the spec describes. Tolerates trailing slashes. */
export function manifestUrl(apiBaseUrl: string, discoveryPath: string): string {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const path = discoveryPath.startsWith('/')
    ? discoveryPath
    : `/${discoveryPath}`;
  return `${base}${path}`;
}

/**
 * Validate manifest shape. Returns the parsed manifest on success, `null`
 * when the payload is malformed. Does not throw — schema mismatch is a
 * silent unsupported state per the design.
 */
export function validateManifest(input: unknown): EnvironmentManifest | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.default !== 'string' || raw.default.length === 0) {
    return null;
  }
  if (!Array.isArray(raw.environments) || raw.environments.length === 0) {
    return null;
  }
  const environments: EnvironmentDescriptor[] = [];
  for (const item of raw.environments) {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const env = item as Record<string, unknown>;
    if (typeof env.id !== 'string' || env.id.length === 0) {
      return null;
    }
    if (typeof env.label !== 'string' || env.label.length === 0) {
      return null;
    }
    if (typeof env.baseUrl !== 'string' || env.baseUrl.length === 0) {
      return null;
    }
    let badge: EnvironmentBadge | undefined;
    if (env.badge !== undefined) {
      if (
        typeof env.badge !== 'string' ||
        !VALID_BADGES.has(env.badge as EnvironmentBadge)
      ) {
        return null;
      }
      badge = env.badge as EnvironmentBadge;
    }
    environments.push({
      id: env.id,
      label: env.label,
      baseUrl: env.baseUrl,
      badge,
    });
  }
  if (!environments.some((e) => e.id === raw.default)) {
    return null;
  }
  return { default: raw.default, environments };
}

/**
 * Fetch + cache a manifest. Resolves to the manifest on 2xx with a valid
 * payload, `null` on 404 / network error / schema mismatch.
 *
 * Errors are intentionally swallowed — the design makes manifest absence
 * a normal mode, not a failure.
 */
export async function fetchManifest(
  opts: ManifestFetchOptions,
): Promise<EnvironmentManifest | null> {
  const url = manifestUrl(opts.apiBaseUrl, opts.discoveryPath);
  const now = Date.now();
  const cached = cache.get(url);
  if (!opts.force && cached && now - cached.fetchedAt < TTL_MS) {
    return cached.manifest;
  }

  const existing = inflight.get(url);
  if (existing) {
    return existing;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  const promise = (async (): Promise<EnvironmentManifest | null> => {
    try {
      const res = await fetch(url, {
        headers,
        signal: opts.signal,
        credentials: 'omit',
      });
      if (res.status === 304 && cached) {
        cache.set(url, { ...cached, fetchedAt: now });
        return cached.manifest;
      }
      if (!res.ok) {
        return null;
      }
      const json: unknown = await res.json();
      const manifest = validateManifest(json);
      if (!manifest) {
        return null;
      }
      cache.set(url, {
        fetchedAt: now,
        manifest,
        etag: res.headers.get('ETag'),
      });
      return manifest;
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}

/** Test helper — exported so unit tests / specimens can reset state. */
export function clearManifestCache(): void {
  cache.clear();
  inflight.clear();
}
