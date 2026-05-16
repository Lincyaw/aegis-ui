/**
 * Horizontal strip of firing chips ordered by ts_ns. Clicking a chip
 * sets the inspector mode + the firing sequence atomically. This is the
 * only place that flips selection.mode — chip clicks inside an inspector
 * stay in the same mode (just highlight cross-pane state).
 */

import { type ReactElement, useEffect, useMemo, useRef } from 'react';

import { Chip, MetricLabel } from '@lincyaw/aegis-ui';

import type { CaseBundle, AuditorFiring, ExtractorFiring } from '../schemas';
import { useCaseSelection } from '../selection';

import './FiringsTimeline.css';

type Entry =
  | { kind: 'extractor'; firing: ExtractorFiring }
  | { kind: 'auditor'; firing: AuditorFiring };

function sortKey(e: Entry): number {
  return e.firing.ts_ns;
}

export function FiringsTimeline({
  bundle,
}: {
  bundle: CaseBundle;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const stripRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [];
    for (const f of bundle.extractor) {
      all.push({ kind: 'extractor', firing: f });
    }
    for (const f of bundle.auditor) {
      all.push({ kind: 'auditor', firing: f });
    }
    all.sort((a, b) => sortKey(a) - sortKey(b));
    return all;
  }, [bundle.extractor, bundle.auditor]);

  const activeKey =
    selection.mode === 'extractor' && selection.extractorSeq !== null
      ? `e${selection.extractorSeq.toString()}`
      : selection.mode === 'auditor' && selection.auditorSeq !== null
        ? `a${selection.auditorSeq.toString()}`
        : null;

  useEffect(() => {
    if (!activeKey) {
      return;
    }
    const el = stripRef.current?.querySelector(`[data-chipkey="${activeKey}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [activeKey]);

  if (entries.length === 0) {
    return (
      <div className='llmh-tl llmh-tl--empty'>
        <MetricLabel size='xs'>no firings</MetricLabel>
      </div>
    );
  }

  return (
    <div className='llmh-tl'>
      <div className='llmh-tl__strip' ref={stripRef}>
        {entries.map((e) => {
          const seq = e.firing.sequence;
          const key = e.kind === 'extractor' ? `e${seq.toString()}` : `a${seq.toString()}`;
          const label = e.kind === 'extractor' ? `E#${seq.toString()}` : `A#${seq.toString()}`;
          const active = activeKey === key;
          const tone: 'ink' | 'default' | 'warning' = active
            ? 'ink'
            : e.kind === 'auditor'
              ? 'warning'
              : 'default';
          const surfaced =
            e.kind === 'auditor' && Boolean(e.firing.output?.surface_reminder);
          return (
            <button
              key={key}
              type='button'
              data-chipkey={key}
              className={[
                'llmh-tl__btn',
                active ? 'llmh-tl__btn--active' : '',
                surfaced ? 'llmh-tl__btn--surfaced' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                if (e.kind === 'extractor') {
                  set({
                    mode: 'extractor',
                    extractorSeq: seq,
                    auditorSeq: null,
                    eventId: null,
                    findingId: null,
                    turn: e.firing.turn_index - 1,
                  });
                } else {
                  set({
                    mode: 'auditor',
                    auditorSeq: seq,
                    extractorSeq: null,
                    eventId: null,
                    findingId: null,
                    turn: e.firing.turn_index - 1,
                  });
                }
              }}
              title={`${label} · turn ${e.firing.turn_index.toString()}${
                surfaced ? ' · surfaced' : ''
              }`}
            >
              <Chip tone={tone}>{label}</Chip>
              <span className='llmh-tl__btn-turn'>t{e.firing.turn_index.toString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
