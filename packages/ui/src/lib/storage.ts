export type StorageArea = 'local' | 'session';

function getArea(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Reads a key, returning null when storage is missing, blocked or empty. */
export function readStorage(
  key: string,
  area: StorageArea = 'local',
): string | null {
  try {
    return getArea(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a key; failures (private mode, quota) are ignored. */
export function writeStorage(
  key: string,
  value: string,
  area: StorageArea = 'local',
): void {
  try {
    getArea(area)?.setItem(key, value);
  } catch {
    // Storage is best-effort.
  }
}

export function removeStorage(key: string, area: StorageArea = 'local'): void {
  try {
    getArea(area)?.removeItem(key);
  } catch {
    // Storage is best-effort.
  }
}

/**
 * Returns the value stored under `key`, creating and storing it with
 * `create` on first use. Falls back to an unstored value when storage is
 * unavailable.
 */
export function getOrCreateStored(
  key: string,
  create: () => string,
  area: StorageArea = 'local',
): string {
  const existing = readStorage(key, area);
  if (existing) {
    return existing;
  }
  const fresh = create();
  writeStorage(key, fresh, area);
  return fresh;
}
