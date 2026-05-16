/**
 * Cross-pane selection state for the case-detail view.
 *
 * Three ID spaces flow through this context:
 *   - main.index  (turn number in main_agent.jsonl)
 *   - extractorSeq / auditorSeq  (firing sequence within its phase)
 *   - eventId  (aggregator-renumbered global event id)
 *
 * Setting any one triggers cascading defaults so panes never need to
 * replicate the lookup (e.g. selecting an eventId auto-resolves the
 * extractorSeq that produced it via `links.eventOrigin`).
 *
 * The hook + Context object live in selection.ts.
 */

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { CaseLinks } from './schemas';
import {
  CaseSelectionContext,
  type CaseSelection,
  type CaseSelectionApi,
  EMPTY_SELECTION,
} from './selection';

function readNum(params: URLSearchParams, key: string): number | null {
  const v = params.get(key);
  if (!v) {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseHash(hash: string): Partial<CaseSelection> {
  if (!hash) {
    return {};
  }
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Partial<CaseSelection> = {};
  const turn = readNum(params, 'turn');
  if (turn !== null) {
    out.turn = turn;
  }
  const e = readNum(params, 'E');
  if (e !== null) {
    out.extractorSeq = e;
  }
  const a = readNum(params, 'A');
  if (a !== null) {
    out.auditorSeq = a;
  }
  const ev = readNum(params, 'event');
  if (ev !== null) {
    out.eventId = ev;
  }
  const fin = params.get('finding');
  if (fin) {
    const m = /^(\d+)\.(\d+)$/.exec(fin);
    if (m) {
      out.findingId = { auditorSeq: Number(m[1]), index: Number(m[2]) };
    }
  }
  return out;
}

function selectionToHash(sel: CaseSelection): string {
  const params = new URLSearchParams();
  if (sel.turn !== null) {
    params.set('turn', String(sel.turn));
  }
  if (sel.extractorSeq !== null) {
    params.set('E', String(sel.extractorSeq));
  }
  if (sel.auditorSeq !== null) {
    params.set('A', String(sel.auditorSeq));
  }
  if (sel.eventId !== null) {
    params.set('event', String(sel.eventId));
  }
  if (sel.findingId) {
    params.set(
      'finding',
      `${sel.findingId.auditorSeq}.${sel.findingId.index}`,
    );
  }
  const s = params.toString();
  return s ? `#${s}` : '';
}

function applyCascade(
  cur: CaseSelection,
  patch: Partial<CaseSelection>,
  links: CaseLinks,
): CaseSelection {
  const next: CaseSelection = { ...cur, ...patch };

  if (patch.eventId !== undefined && patch.eventId !== null) {
    if (patch.extractorSeq === undefined) {
      const origin = links.eventOrigin.get(patch.eventId);
      if (origin) {
        next.extractorSeq = origin.extractorSeq;
      }
    }
  }

  if (patch.findingId !== undefined && patch.findingId !== null) {
    if (patch.auditorSeq === undefined) {
      next.auditorSeq = patch.findingId.auditorSeq;
    }
  }

  if (
    patch.findingId === undefined &&
    patch.auditorSeq !== undefined &&
    patch.auditorSeq !== cur.auditorSeq
  ) {
    next.findingId = null;
  }

  return next;
}

interface ProviderProps {
  links: CaseLinks;
  urlSync?: boolean;
  children: ReactNode;
}

export function CaseSelectionProvider({
  links,
  urlSync = true,
  children,
}: ProviderProps): ReactElement {
  const [selection, setState] = useState<CaseSelection>(() => {
    if (typeof window === 'undefined' || !urlSync) {
      return EMPTY_SELECTION;
    }
    return { ...EMPTY_SELECTION, ...parseHash(window.location.hash) };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !urlSync) {
      return undefined;
    }
    const onHash = (): void => {
      setState((cur) => ({
        ...EMPTY_SELECTION,
        ...cur,
        ...parseHash(window.location.hash),
      }));
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
    };
  }, [urlSync]);

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

  const set = useCallback(
    (patch: Partial<CaseSelection>) => {
      setState((cur) => applyCascade(cur, patch, links));
    },
    [links],
  );

  const value = useMemo<CaseSelectionApi>(
    () => ({ selection, set }),
    [selection, set],
  );

  return (
    <CaseSelectionContext.Provider value={value}>
      {children}
    </CaseSelectionContext.Provider>
  );
}
