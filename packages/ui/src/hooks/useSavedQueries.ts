// Saved-query storage shape adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/savedSearch.ts
import { useCallback, useMemo, useRef } from 'react';

import { uniqueId } from '../lib/id';
import { useStrings } from '../locale';
import { useStorageItem } from './useStorageItem';

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

function parseQueries(raw: string | null): SavedQuery[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedQuery) : [];
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

function sortQueries(queries: SavedQuery[]): SavedQuery[] {
  return [...queries].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.lastUsedAt - a.lastUsedAt;
  });
}

/**
 * Saved queries kept in localStorage under a namespace, for hosts that have
 * no server-side store. Pass the result to `SavedQueryBar`. A server render
 * and the hydration that follows see no queries; the stored ones apply
 * right after.
 */
export function useSavedQueries(
  opts: UseSavedQueriesOptions,
): UseSavedQueriesReturn {
  const { untitledQuery } = useStrings();
  const [raw, setRaw] = useStorageItem(storageKey(opts.namespace));
  const queries = useMemo(() => sortQueries(parseQueries(raw)), [raw]);
  // Updates apply to the latest list even when several run before a render.
  const latestRef = useRef(queries);
  latestRef.current = queries;

  const update = useCallback(
    (change: (prev: SavedQuery[]) => SavedQuery[]): void => {
      const next = sortQueries(change(latestRef.current));
      latestRef.current = next;
      setRaw(JSON.stringify(next));
    },
    [setRaw],
  );

  const save = useCallback(
    (name: string, value: string): SavedQuery => {
      const entry: SavedQuery = {
        id: uniqueId('sq'),
        name: name.trim() === '' ? untitledQuery : name.trim(),
        value,
        pinned: false,
        lastUsedAt: Date.now(),
      };
      update((prev) => [...prev, entry]);
      return entry;
    },
    [update, untitledQuery],
  );

  const remove = useCallback(
    (id: string): void => {
      update((prev) => prev.filter((q) => q.id !== id));
    },
    [update],
  );

  const rename = useCallback(
    (id: string, name: string): void => {
      const trimmed = name.trim() === '' ? untitledQuery : name.trim();
      update((prev) =>
        prev.map((q) => (q.id === id ? { ...q, name: trimmed } : q)),
      );
    },
    [update, untitledQuery],
  );

  const togglePinned = useCallback(
    (id: string): void => {
      update((prev) =>
        prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)),
      );
    },
    [update],
  );

  const touch = useCallback(
    (id: string): void => {
      update((prev) =>
        prev.map((q) => (q.id === id ? { ...q, lastUsedAt: Date.now() } : q)),
      );
    },
    [update],
  );

  return useMemo(
    () => ({ queries, save, remove, rename, togglePinned, touch }),
    [queries, save, remove, rename, togglePinned, touch],
  );
}
