import { useCallback, useEffect } from 'react';

import type { SpanRow } from './api/clickhouse';

import type { PrimaryView } from './prefs';
import type { Selection } from './selection';

interface KeyboardNavArgs {
  /** Spans currently visible in the main view (already filter-applied). */
  visibleSpans: SpanRow[];
  /** All sessions in the trace (for [/] navigation). */
  sessionIds: string[];
  selection: Selection;
  setSelection: (patch: Partial<Selection>) => void;
  toggleInspector: () => void;
  showHelp: () => void;
}

const SHORTCUTS: Array<{ keys: string; desc: string }> = [
  { keys: 'j / k', desc: 'next / previous span in current view' },
  { keys: '[  ]', desc: 'previous / next session' },
  { keys: '1 / 2', desc: 'switch to Storyline / Trace view' },
  { keys: 'i', desc: 'toggle inspector pane' },
  { keys: '?', desc: 'show this help' },
  { keys: 'Esc', desc: 'clear selection' },
];

export const KEYBOARD_SHORTCUTS = SHORTCUTS;

function isFromInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useKeyboardNav({
  visibleSpans,
  sessionIds,
  selection,
  setSelection,
  toggleInspector,
  showHelp,
}: KeyboardNavArgs): void {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (isFromInputTarget(e.target)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      switch (e.key) {
        case 'j':
        case 'k': {
          if (visibleSpans.length === 0) {
            return;
          }
          const dir = e.key === 'j' ? 1 : -1;
          const cur = visibleSpans.findIndex(
            (s) => s.spanId === selection.spanId
          );
          const next =
            cur < 0
              ? dir > 0
                ? 0
                : visibleSpans.length - 1
              : (cur + dir + visibleSpans.length) % visibleSpans.length;
          const target = visibleSpans[next];
          if (target) {
            setSelection({ spanId: target.spanId });
          }
          e.preventDefault();
          break;
        }
        case '[':
        case ']': {
          if (sessionIds.length === 0) {
            return;
          }
          const dir = e.key === ']' ? 1 : -1;
          const cur = sessionIds.indexOf(selection.sessionId);
          // Treat empty selection as "before first" so [ wraps to last and ] goes to first.
          const next =
            cur < 0
              ? dir > 0
                ? 0
                : sessionIds.length - 1
              : (cur + dir + sessionIds.length) % sessionIds.length;
          const target = sessionIds[next];
          if (target !== undefined) {
            setSelection({ sessionId: target });
          }
          e.preventDefault();
          break;
        }
        case '1':
        case '2': {
          const view: PrimaryView = e.key === '1' ? 'storyline' : 'trace';
          setSelection({ view });
          e.preventDefault();
          break;
        }
        case 'i': {
          toggleInspector();
          e.preventDefault();
          break;
        }
        case '?': {
          showHelp();
          e.preventDefault();
          break;
        }
        case 'Escape': {
          setSelection({ spanId: '', sessionId: '' });
          e.preventDefault();
          break;
        }
        default:
      }
    },
    [
      visibleSpans,
      sessionIds,
      selection,
      setSelection,
      toggleInspector,
      showHelp,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
