import { type ReactElement, useEffect, useMemo, useRef } from 'react';

import { MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import { contentExcerpt } from '../../../agentm/agentContent';
import { normalizeTurn } from '../messageAdapter';
import type { CaseBundle } from '../schemas';
import { useCaseSelection } from '../selection';

import { useDetailModal } from './detailModalContext';

const EXCERPT_LIMIT = 80;

interface TurnRailProps {
  bundle: CaseBundle;
}

export function TurnRail({ bundle }: TurnRailProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const { openDetail } = useDetailModal();
  const containerRef = useRef<HTMLDivElement>(null);

  const citedTurns = useMemo<Set<number>>(() => {
    if (selection.eventId === null) {
      return new Set();
    }
    for (const f of bundle.extractor) {
      const ev = f.output?.events.find((e) => e.id === selection.eventId);
      if (ev) {
        return new Set(ev.source_turns);
      }
    }
    return new Set();
  }, [selection.eventId, bundle.extractor]);

  const firingWindow = useMemo<Set<number>>(() => {
    if (selection.mode === 'extractor' && selection.extractorSeq !== null) {
      const f = bundle.extractor.find(
        (x) => x.sequence === selection.extractorSeq
      );
      if (f) {
        return new Set(f.input.payload.new_turns.map((t) => t.index));
      }
    }
    if (selection.mode === 'auditor' && selection.auditorSeq !== null) {
      const f = bundle.auditor.find((x) => x.sequence === selection.auditorSeq);
      if (f) {
        return new Set([f.turn_index - 1]);
      }
    }
    return new Set();
  }, [
    selection.mode,
    selection.extractorSeq,
    selection.auditorSeq,
    bundle.extractor,
    bundle.auditor,
  ]);

  const reminderForTurn = useMemo<Map<number, number>>(() => {
    const m = new Map<number, number>();
    for (const [auditorSeq, turnIndex] of bundle.links.reminderInjection) {
      m.set(turnIndex, auditorSeq);
    }
    return m;
  }, [bundle.links.reminderInjection]);

  useEffect(() => {
    if (selection.turn === null) {
      return;
    }
    const el = containerRef.current?.querySelector(
      `[data-turn="${selection.turn.toString()}"]`
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selection.turn]);

  return (
    <div className='llmh-cdp__rail' ref={containerRef}>
      <header className='llmh-cdp__rail-head'>
        Main agent
        <MetricLabel size='xs'>{bundle.main.length}</MetricLabel>
      </header>
      <div className='llmh-cdp__rail-list'>
        {bundle.main.map((turn) => {
          const idx = turn.index;
          const selected = selection.turn === idx;
          const cited = citedTurns.has(idx);
          const inWindow = firingWindow.has(idx);
          const hasReminder = reminderForTurn.has(idx);
          const cls = [
            'llmh-cdp__rail-row',
            `llmh-cdp__rail-row--${turn.role}`,
            selected ? 'llmh-cdp__rail-row--selected' : '',
            cited ? 'llmh-cdp__rail-row--cited' : '',
            inWindow ? 'llmh-cdp__rail-row--window' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={idx}
              data-turn={idx}
              className={cls}
              role='button'
              tabIndex={0}
              onClick={() => {
                // Keep mode/extractorSeq/auditorSeq intact so the center
                // graph viewport stays on its current firing — single
                // click on a turn is just focus, not navigation.
                set({
                  turn: idx,
                  eventId: null,
                  findingId: null,
                });
              }}
              onDoubleClick={() => {
                set({
                  turn: idx,
                  eventId: null,
                  findingId: null,
                });
                openDetail();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  set({
                    turn: idx,
                    eventId: null,
                    findingId: null,
                  });
                }
              }}
            >
              <div className='llmh-cdp__rail-row-meta'>
                <MonoValue size='sm'>#{idx}</MonoValue>
                <span className='llmh-cdp__rail-row-role'>{turn.role}</span>
                {hasReminder && (
                  <span
                    className='llmh-cdp__rail-row-mark'
                    aria-label='reminder injected'
                  >
                    ●
                  </span>
                )}
              </div>
              <div className='llmh-cdp__rail-row-text'>
                {contentExcerpt(normalizeTurn(turn).blocks, EXCERPT_LIMIT)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
