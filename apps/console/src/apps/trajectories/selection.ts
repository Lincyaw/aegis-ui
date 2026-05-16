import { useCallback, useEffect, useState } from 'react';

import type { PrimaryView } from './prefs';

export interface Selection {
  /** Selected agentm.session.span_id, '' for "all sessions". */
  sessionId: string;
  /** Selected span (any span). */
  spanId: string;
  /** Active main view tab. */
  view: PrimaryView;
}

const EMPTY: Selection = { sessionId: '', spanId: '', view: 'storyline' };

function parseHash(hash: string): Partial<Selection> {
  if (!hash) {
    return {};
  }
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Partial<Selection> = {};
  const session = params.get('session');
  if (session) {
    out.sessionId = session;
  }
  const span = params.get('span');
  if (span) {
    out.spanId = span;
  }
  const view = params.get('view');
  if (view === 'storyline' || view === 'trace' || view === 'timeline') {
    out.view = view;
  }
  return out;
}

function selectionToHash(sel: Selection): string {
  const params = new URLSearchParams();
  if (sel.sessionId) {
    params.set('session', sel.sessionId);
  }
  if (sel.spanId) {
    params.set('span', sel.spanId);
  }
  if (sel.view !== 'storyline') {
    params.set('view', sel.view);
  }
  const s = params.toString();
  return s ? `#${s}` : '';
}

/**
 * Selection state shared across the three SessionDetail panes. Mirrored
 * to ``window.location.hash`` so a URL alone deep-links into a specific
 * session / span / view.
 *
 * Hash format: ``#session=<sid>&span=<spanId>&view=trace``. Omitted keys
 * fall back to defaults.
 */
export function useSelection(
  defaultView: PrimaryView,
  urlSync = true
): {
  selection: Selection;
  setSelection: (patch: Partial<Selection>) => void;
} {
  const [selection, setState] = useState<Selection>(() => {
    if (typeof window === 'undefined' || !urlSync) {
      return { ...EMPTY, view: defaultView };
    }
    return { ...EMPTY, view: defaultView, ...parseHash(window.location.hash) };
  });

  // Sync hash → state (back/forward navigation, manual edits).
  useEffect(() => {
    if (typeof window === 'undefined' || !urlSync) {
      return;
    }
    const onHash = (): void => {
      setState((cur) => ({ ...cur, ...parseHash(window.location.hash) }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [urlSync]);

  // Sync state → hash. Use replaceState to avoid spamming history.
  useEffect(() => {
    if (typeof window === 'undefined' || !urlSync) {
      return;
    }
    const next = selectionToHash(selection);
    if (next !== window.location.hash) {
      const url = `${window.location.pathname}${window.location.search}${next}`;
      window.history.replaceState(null, '', url);
    }
  }, [selection, urlSync]);

  const setSelection = useCallback((patch: Partial<Selection>) => {
    setState((cur) => ({ ...cur, ...patch }));
  }, []);

  return { selection, setSelection };
}
