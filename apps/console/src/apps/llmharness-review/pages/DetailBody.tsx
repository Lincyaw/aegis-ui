import { type ReactElement } from 'react';

import { Chip, EmptyState, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import { MessageBlocks } from '../components';
import type {
  CaseBundle,
  ExtractorEvent,
  ExtractorFiring,
  Finding,
} from '../schemas';
import { useCaseSelection } from '../selection';

interface DetailBodyProps {
  bundle: CaseBundle;
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

/** The selected event, finding or turn, shown in the detail modal. */
export function DetailBody({ bundle }: DetailBodyProps): ReactElement {
  const { selection, set } = useCaseSelection();

  // --- Event detail
  if (selection.eventId !== null) {
    const hit = findEventById(bundle, selection.eventId);
    if (!hit) {
      return (
        <div className='llmh-insp'>
          <EmptyState
            title={`Event #${selection.eventId.toString()} not found`}
            description='This id is not present in any firing output or snapshot.'
          />
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
      </div>
    );
  }

  // --- Finding detail
  if (selection.findingId !== null) {
    const aud = bundle.auditor.find(
      (a) => a.sequence === selection.findingId?.auditorSeq
    );
    const finding = aud?.input.findings.find(
      (f) => f.index === selection.findingId?.index
    );
    if (!aud || !finding) {
      return (
        <div className='llmh-insp'>
          <EmptyState title='Finding not found' />
          <div className='llmh-insp__chip-row'>
            <Chip
              tone='ghost'
              onClick={() => {
                set({ findingId: null });
              }}
            >
              clear finding
            </Chip>
          </div>
        </div>
      );
    }
    return (
      <div className='llmh-insp'>
        <section className='llmh-insp__section'>
          <header className='llmh-insp__sec-head'>
            <span>finding</span>
            <MetricLabel size='xs'>
              A#{aud.sequence} · F#{finding.index}
            </MetricLabel>
          </header>
          <div className='llmh-insp__chip-row'>
            <Chip tone='default'>{finding.kind}</Chip>
          </div>
          <div className='llmh-cdp__detail-summary'>{finding.summary}</div>
          {finding.related_event_ids.length > 0 && (
            <div className='llmh-insp__chip-row'>
              <span>related events:</span>
              {finding.related_event_ids.map((id) => (
                <Chip
                  key={id}
                  tone={selection.eventId === id ? 'ink' : 'default'}
                  onClick={() => {
                    set({ eventId: id });
                  }}
                >
                  #{id}
                </Chip>
              ))}
            </div>
          )}
        </section>
        <div className='llmh-insp__chip-row'>
          <Chip
            tone='ghost'
            onClick={() => {
              set({ findingId: null });
            }}
          >
            clear finding
          </Chip>
        </div>
      </div>
    );
  }

  // --- Turn detail
  //
  // Turn must be checked BEFORE the firing-mode branch: the center graph
  // viewport stays alive even when the user picks a turn (single-click
  // on a row no longer clears mode/extractorSeq), so the firing inspector
  // would otherwise win and the modal would show firing meta instead of
  // the turn message the user just double-clicked.
  if (selection.turn !== null) {
    const turn = bundle.main.find((t) => t.index === selection.turn);
    if (!turn) {
      return (
        <div className='llmh-insp'>
          <EmptyState title={`Turn #${selection.turn.toString()} not found`} />
          <div className='llmh-insp__chip-row'>
            <Chip
              tone='ghost'
              onClick={() => {
                set({ turn: null });
              }}
            >
              clear turn
            </Chip>
          </div>
        </div>
      );
    }
    const ext = bundle.links.turnToExtractor.get(turn.index) ?? [];
    const aud = bundle.links.turnToAuditor.get(turn.index) ?? [];
    const turnIdx = bundle.main.findIndex((t) => t.index === turn.index);
    const prevTurn = turnIdx > 0 ? bundle.main[turnIdx - 1] : undefined;
    const nextTurn =
      turnIdx >= 0 && turnIdx < bundle.main.length - 1
        ? bundle.main[turnIdx + 1]
        : undefined;
    return (
      <div className='llmh-insp'>
        <div className='llmh-insp__sticky-head'>
          <div className='llmh-insp__sticky-title'>
            <MetricLabel size='xs'>Turn</MetricLabel>
            <MonoValue size='sm'>#{turn.index}</MonoValue>
            <span className='llmh-cdp__rail-row-role'>{turn.role}</span>
            <MetricLabel size='xs'>
              {turnIdx + 1} / {bundle.main.length}
            </MetricLabel>
          </div>
          <div className='llmh-insp__sticky-nav'>
            <Chip
              tone='default'
              onClick={() => {
                if (prevTurn) {
                  set({
                    turn: prevTurn.index,
                    mode: null,
                    extractorSeq: null,
                    auditorSeq: null,
                    eventId: null,
                    findingId: null,
                  });
                }
              }}
            >
              ← {prevTurn ? `#${prevTurn.index.toString()}` : 'prev'}
            </Chip>
            <Chip
              tone='default'
              onClick={() => {
                if (nextTurn) {
                  set({
                    turn: nextTurn.index,
                    mode: null,
                    extractorSeq: null,
                    auditorSeq: null,
                    eventId: null,
                    findingId: null,
                  });
                }
              }}
            >
              {nextTurn ? `#${nextTurn.index.toString()}` : 'next'} →
            </Chip>
          </div>
        </div>
        <section className='llmh-insp__section'>
          <header className='llmh-insp__sec-head'>
            <span>turn</span>
            <MetricLabel size='xs'>
              #{turn.index} · {turn.role}
            </MetricLabel>
          </header>
          {(ext.length > 0 || aud.length > 0) && (
            <div className='llmh-insp__chip-row'>
              <span>cited by:</span>
              {ext.map((s) => (
                <Chip
                  key={`e${s.toString()}`}
                  tone={
                    selection.mode === 'extractor' &&
                    selection.extractorSeq === s
                      ? 'ink'
                      : 'default'
                  }
                  onClick={() => {
                    set({
                      mode: 'extractor',
                      extractorSeq: s,
                      auditorSeq: null,
                    });
                  }}
                >
                  E#{s}
                </Chip>
              ))}
              {aud.map((s) => (
                <Chip
                  key={`a${s.toString()}`}
                  tone={
                    selection.mode === 'auditor' && selection.auditorSeq === s
                      ? 'ink'
                      : 'default'
                  }
                  onClick={() => {
                    set({
                      mode: 'auditor',
                      auditorSeq: s,
                      extractorSeq: null,
                    });
                  }}
                >
                  A#{s}
                </Chip>
              ))}
            </div>
          )}
        </section>
        <section className='llmh-insp__section'>
          <MessageBlocks turn={turn} />
        </section>
        <div className='llmh-insp__chip-row'>
          <Chip
            tone='ghost'
            onClick={() => {
              set({ turn: null });
            }}
          >
            clear turn
          </Chip>
        </div>
      </div>
    );
  }

  return (
    <div className='llmh-insp'>
      <EmptyState
        title='Nothing selected'
        description='Pick a firing in the timeline above, or click a graph node / turn.'
      />
    </div>
  );
}
