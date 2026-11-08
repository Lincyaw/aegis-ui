import { type ReactElement } from 'react';

import { Chip, EmptyState, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import type {
  CaseBundle,
  ExtractorEvent,
  ExtractorFiring,
  Finding,
} from '../schemas';
import { useCaseSelection } from '../selection';

interface EventDetailProps {
  bundle: CaseBundle;
  eventId: number;
}

function findEventById(
  bundle: CaseBundle,
  id: number
): { event: ExtractorEvent; firing: ExtractorFiring } | null {
  for (const f of bundle.extractor) {
    const ev = f.output?.events.find((e) => e.id === id);
    if (ev) {
      return { event: ev, firing: f };
    }
  }
  for (const snap of bundle.graphs.values()) {
    const ev = snap.events.find((e) => e.id === id);
    if (ev) {
      const firing = bundle.extractor.find(
        (x) => x.sequence === snap.after_extractor_firing
      );
      if (firing) {
        return { event: ev, firing };
      }
    }
  }
  return null;
}

function findingsCitingEvent(
  bundle: CaseBundle,
  eventId: number
): Array<{ auditorSeq: number; finding: Finding }> {
  const out: Array<{ auditorSeq: number; finding: Finding }> = [];
  for (const a of bundle.auditor) {
    for (const f of a.input.findings) {
      if (f.related_event_ids.includes(eventId)) {
        out.push({ auditorSeq: a.sequence, finding: f });
      }
    }
  }
  return out;
}

/** One extractor event: its summary, source turns, refs and the findings
 *  that cite it. */
export function EventDetail({
  bundle,
  eventId,
}: EventDetailProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const clearChip = (
    <div className='llmh-insp__chip-row'>
      <Chip
        tone='ghost'
        onClick={() => {
          set({ eventId: null });
        }}
      >
        clear event
      </Chip>
    </div>
  );

  const hit = findEventById(bundle, eventId);
  if (!hit) {
    return (
      <div className='llmh-insp'>
        <EmptyState
          title={`Event #${eventId.toString()} not found`}
          description='This id is not present in any firing output or snapshot.'
        />
        {clearChip}
      </div>
    );
  }
  const { event, firing } = hit;
  const citing = findingsCitingEvent(bundle, event.id);
  const refs = (event.refs ?? []) as Array<{
    dst: number;
    kind: string;
    cited_quote?: string;
  }>;
  const externalRefs = (event as { external_refs?: unknown }).external_refs;
  return (
    <div className='llmh-insp'>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>event</span>
          <MetricLabel size='xs'>
            #{event.id} · origin E#{firing.sequence}
          </MetricLabel>
        </header>
        <div className='llmh-insp__chip-row'>
          <Chip tone='default'>{event.kind}</Chip>
        </div>
        <div className='llmh-cdp__detail-summary'>{event.summary}</div>
        {event.source_turns.length > 0 && (
          <div className='llmh-insp__chip-row'>
            <span>source_turns:</span>
            {event.source_turns.map((t) => (
              <Chip
                key={t}
                tone={selection.turn === t ? 'ink' : 'default'}
                onClick={() => {
                  set({
                    turn: t,
                    mode: null,
                    extractorSeq: null,
                    auditorSeq: null,
                    eventId: null,
                    findingId: null,
                  });
                }}
              >
                #{t}
              </Chip>
            ))}
          </div>
        )}
      </section>

      {refs.length > 0 && (
        <section className='llmh-insp__section'>
          <header className='llmh-insp__sec-head'>
            <span>refs</span>
            <MetricLabel size='xs'>{refs.length}</MetricLabel>
          </header>
          {refs.map((r, i) => (
            <div key={i} className='llmh-cdp__detail-ref'>
              <div className='llmh-insp__chip-row'>
                <MonoValue size='sm'>→ #{r.dst}</MonoValue>
                <Chip tone='default'>{r.kind}</Chip>
                <Chip
                  tone='ghost'
                  onClick={() => {
                    set({ eventId: r.dst });
                  }}
                >
                  open
                </Chip>
              </div>
              {r.cited_quote && (
                <div className='llmh-insp__pre'>{r.cited_quote}</div>
              )}
            </div>
          ))}
        </section>
      )}

      {externalRefs !== undefined && (
        <details className='llmh-insp__details'>
          <summary>external_refs</summary>
          <pre className='llmh-insp__pre'>
            {JSON.stringify(externalRefs, null, 2)}
          </pre>
        </details>
      )}

      {citing.length > 0 && (
        <section className='llmh-insp__section'>
          <header className='llmh-insp__sec-head'>
            <span>cited by findings</span>
            <MetricLabel size='xs'>{citing.length}</MetricLabel>
          </header>
          <div className='llmh-insp__chip-row'>
            {citing.map((c) => (
              <Chip
                key={`${c.auditorSeq.toString()}.${c.finding.index.toString()}`}
                tone={
                  selection.findingId?.auditorSeq === c.auditorSeq &&
                  selection.findingId.index === c.finding.index
                    ? 'ink'
                    : 'default'
                }
                onClick={() => {
                  set({
                    findingId: {
                      auditorSeq: c.auditorSeq,
                      index: c.finding.index,
                    },
                  });
                }}
              >
                A#{c.auditorSeq} · F#{c.finding.index}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {clearChip}
    </div>
  );
}
