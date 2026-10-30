/**
 * Per-root-session tab bookkeeping. We key by root_session_id so
 * reconnecting to the same root (e.g. across a page refresh) restores
 * the same open tabs.
 *
 * The state is persisted in ``sessionStorage`` — not localStorage —
 * because tab visibility is a UI preference scoped to a browser session
 * and live trees disappear when the agent process exits. Persisting
 * across browser restarts would surface stale ids.
 */

import { create } from 'zustand';

interface TabsByRoot {
  [rootSessionId: string]: {
    openTabs: string[];
    active: string | null;
  };
}

interface TabsState {
  byRoot: TabsByRoot;
}

interface TabsActions {
  openTab: (root: string, sessionId: string) => void;
  closeTab: (root: string, sessionId: string) => void;
  setActive: (root: string, sessionId: string | null) => void;
  resetRoot: (root: string) => void;
}

type Store = TabsState & TabsActions;

const STORAGE_KEY = 'llmharness-live.open-tabs';

function loadInitial(): TabsByRoot {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as TabsByRoot;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function persist(byRoot: TabsByRoot): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(byRoot));
  } catch {
    // sessionStorage may be unavailable (private mode etc). Silent OK.
  }
}

export const useTabsStore = create<Store>((set) => ({
  byRoot: loadInitial(),

  openTab: (root, sessionId): void => {
    set((s) => {
      const current = s.byRoot[root] ?? { openTabs: [], active: null };
      if (current.openTabs.includes(sessionId)) {
        if (current.active === sessionId) {
          return s;
        }
        const next: TabsByRoot = {
          ...s.byRoot,
          [root]: { ...current, active: sessionId },
        };
        persist(next);
        return { byRoot: next };
      }
      const next: TabsByRoot = {
        ...s.byRoot,
        [root]: {
          openTabs: [...current.openTabs, sessionId],
          active: sessionId,
        },
      };
      persist(next);
      return { byRoot: next };
    });
  },

  closeTab: (root, sessionId): void => {
    set((s) => {
      const current = s.byRoot[root];
      if (!current) {
        return s;
      }
      const remaining = current.openTabs.filter((t) => t !== sessionId);
      const active =
        current.active === sessionId
          ? (remaining[remaining.length - 1] ?? null)
          : current.active;
      const next: TabsByRoot = {
        ...s.byRoot,
        [root]: { openTabs: remaining, active },
      };
      persist(next);
      return { byRoot: next };
    });
  },

  setActive: (root, sessionId): void => {
    set((s) => {
      const current = s.byRoot[root] ?? { openTabs: [], active: null };
      if (current.active === sessionId) {
        return s;
      }
      const next: TabsByRoot = {
        ...s.byRoot,
        [root]: { ...current, active: sessionId },
      };
      persist(next);
      return { byRoot: next };
    });
  },

  resetRoot: (root): void => {
    set((s) => {
      if (!(root in s.byRoot)) {
        return s;
      }
      const { [root]: _drop, ...rest } = s.byRoot;
      void _drop;
      persist(rest);
      return { byRoot: rest };
    });
  },
}));
