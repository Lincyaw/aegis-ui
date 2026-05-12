import { useCallback, useEffect, useState } from 'react';

import type { SpanKind } from './spanKind';

const STORAGE_KEY = 'aegis.trajectories.prefs.v1';

export type PrimaryView = 'storyline' | 'trace';

export interface CustomSpanRule {
  /** Substring match on SpanName. First matching rule wins. */
  pattern: string;
  /** Bucket the span gets reclassified into. */
  kind: SpanKind;
}

export interface TrajectoriesPrefs {
  /** Span kinds to hide from views (TraceTree, Storyline). */
  hiddenSpanKinds: SpanKind[];
  /** Hide spans with duration shorter than this (ms). */
  minDurationMs: number;
  /** When true, only show spans with status=ERROR. */
  errorsOnly: boolean;
  /** Default tab for SessionDetail. */
  defaultView: PrimaryView;
  /** Pixel widths for the resizable side panes. */
  sessionsWidth: number;
  inspectorWidth: number;
  /** Whether each side pane is collapsed. */
  sessionsCollapsed: boolean;
  inspectorCollapsed: boolean;
  /**
   * User-defined SpanName → kind overrides. Evaluated before the
   * built-in ``classifySpan`` rules so non-AgentM traces or custom
   * extensions can still light up Storyline / chips.
   */
  customSpanRules: CustomSpanRule[];
}

const DEFAULT_PREFS: TrajectoriesPrefs = {
  hiddenSpanKinds: ['event', 'handler', 'bootstrap'],
  minDurationMs: 1,
  errorsOnly: false,
  defaultView: 'storyline',
  sessionsWidth: 280,
  inspectorWidth: 360,
  sessionsCollapsed: false,
  inspectorCollapsed: false,
  customSpanRules: [],
};

function readPrefs(): TrajectoriesPrefs {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<TrajectoriesPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(p: TrajectoriesPrefs): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // quota / private mode — silently degrade.
  }
}

/**
 * Workspace-local user preferences for the trajectories app. Backed by
 * localStorage; one source of truth shared across SessionDetail panes.
 */
export function useTrajectoriesPrefs(): {
  prefs: TrajectoriesPrefs;
  setPrefs: (patch: Partial<TrajectoriesPrefs>) => void;
  toggleHiddenKind: (kind: SpanKind) => void;
  reset: () => void;
} {
  const [prefs, setState] = useState<TrajectoriesPrefs>(readPrefs);

  useEffect(() => {
    writePrefs(prefs);
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<TrajectoriesPrefs>) => {
    setState((cur) => ({ ...cur, ...patch }));
  }, []);

  const toggleHiddenKind = useCallback((kind: SpanKind) => {
    setState((cur) => {
      const has = cur.hiddenSpanKinds.includes(kind);
      return {
        ...cur,
        hiddenSpanKinds: has
          ? cur.hiddenSpanKinds.filter((k) => k !== kind)
          : [...cur.hiddenSpanKinds, kind],
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_PREFS);
  }, []);

  return { prefs, setPrefs, toggleHiddenKind, reset };
}

/** Span kinds that show up as filter chips in the toolbar. */
export const FILTERABLE_SPAN_KINDS: Array<{ kind: SpanKind; label: string }> = [
  { kind: 'session', label: 'session' },
  { kind: 'turn', label: 'turn' },
  { kind: 'llm', label: 'llm' },
  { kind: 'tool', label: 'tool' },
  { kind: 'event', label: 'event' },
  { kind: 'handler', label: 'handler' },
  { kind: 'bootstrap', label: 'bootstrap' },
];
