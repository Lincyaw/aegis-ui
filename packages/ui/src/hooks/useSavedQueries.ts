// Saved-query storage shape adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/savedSearch.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SavedQuery {
  id: string;
  name: string;
  /** Opaque payload — usually a stringified URL-state object or the canonical query string. */
  value: string;
  /** Pinned queries float to the top. */
  pinned: boolean;
  /** Last-used timestamp (epoch ms). */
  lastUsedAt: number;
}

export interface UseSavedQueriesOptions {
  /** localStorage key prefix; required so two sub-apps don't collide. */
  namespace: string;
}

export interface UseSavedQueriesReturn {
  queries: SavedQuery[];
  save: (name: string, value: string) => SavedQuery;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  togglePinned: (id: string) => void;
  touch: (id: string) => void;
}

const STORAGE_PREFIX = 'aegis.saved-queries.';

function storageKey(namespace: string): string {
  return STORAGE_PREFIX + namespace;
}

function readFromStorage(namespace: string): SavedQuery[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(namespace));
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSavedQuery);
  } catch {
    return [];
  }
}

function isSavedQuery(value: unknown): value is SavedQuery {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const q = value as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.name === 'string' &&
    typeof q.value === 'string' &&
    typeof q.pinned === 'boolean' &&
    typeof q.lastUsedAt === 'number'
  );
}

function writeToStorage(namespace: string, queries: SavedQuery[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(namespace), JSON.stringify(queries));
  } catch {
    // quota / disabled storage — silently ignore
  }
}

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortQueries(queries: SavedQuery[]): SavedQuery[] {
  return [...queries].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.lastUsedAt - a.lastUsedAt;
  });
}

export function useSavedQueries(
  opts: UseSavedQueriesOptions,
): UseSavedQueriesReturn {
  const { namespace } = opts;
  const [queries, setQueries] = useState<SavedQuery[]>(() =>
    sortQueries(readFromStorage(namespace)),
  );

  const hydratedNamespaceRef = useRef<string>(namespace);
  useEffect(() => {
    if (hydratedNamespaceRef.current === namespace) {
      return;
    }
    hydratedNamespaceRef.current = namespace;
    setQueries(sortQueries(readFromStorage(namespace)));
  }, [namespace]);

  const persist = useCallback(
    (next: SavedQuery[]): SavedQuery[] => {
      const sorted = sortQueries(next);
      writeToStorage(namespace, sorted);
      return sorted;
    },
    [namespace],
  );

  const save = useCallback(
    (name: string, value: string): SavedQuery => {
      const entry: SavedQuery = {
        id: newId(),
        name: name.trim() === '' ? 'Untitled query' : name.trim(),
        value,
        pinned: false,
        lastUsedAt: Date.now(),
      };
      setQueries((prev) => persist([...prev, entry]));
      return entry;
    },
    [persist],
  );

  const remove = useCallback(
    (id: string): void => {
      setQueries((prev) => persist(prev.filter((q) => q.id !== id)));
    },
    [persist],
  );

  const rename = useCallback(
    (id: string, name: string): void => {
      const trimmed = name.trim() === '' ? 'Untitled query' : name.trim();
      setQueries((prev) =>
        persist(prev.map((q) => (q.id === id ? { ...q, name: trimmed } : q))),
      );
    },
    [persist],
  );

  const togglePinned = useCallback(
    (id: string): void => {
      setQueries((prev) =>
        persist(
          prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)),
        ),
      );
    },
    [persist],
  );

  const touch = useCallback(
    (id: string): void => {
      setQueries((prev) =>
        persist(
          prev.map((q) => (q.id === id ? { ...q, lastUsedAt: Date.now() } : q)),
        ),
      );
    },
    [persist],
  );

  return useMemo(
    () => ({ queries, save, remove, rename, togglePinned, touch }),
    [queries, save, remove, rename, togglePinned, touch],
  );
}
