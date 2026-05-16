/**
 * Inspector pane shown when selection.mode === 'extractor'. Renders the
 * one extractor firing's input meta, produced events, edges, and any
 * dropped edges. Clicking an event sets selection.eventId so the Main
 * column highlights `event.source_turns` (cross-pane bridge).
 */

import { type ReactElement, useMemo } from 'react';

import {
  Chip,
  EmptyState,
  MetricLabel,
  MonoValue,
} from '@lincyaw/aegis-ui';

import { EventGraphView } from '../../components';
import type {
  CaseBundle,
  ExtractorEvent,
  ExtractorFiring,
} from '../../schemas';
import { useCaseSelection } from '../../selection';

import './Inspector.css';

interface Props {
  firing: ExtractorFiring;
  bundle: CaseBundle;
}

function ExtractorEventRow({
  event,
  cited,
}: {
  event: ExtractorEvent;
  cited: boolean;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const selected = selection.eventId === event.id;
  const cls = [
    'llmh-insp__row',
    selected ? 'llmh-insp__row--selected' : '',
    cited ? 'llmh-insp__row--cited' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      role='button'
      tabIndex={0}
      onClick={() => {
        set({ eventId: event.id });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          set({ eventId: event.id });
        }
      }}
    >
      <MonoValue size='sm'>#{event.id}</MonoValue>
      <Chip tone='default'>{event.kind}</Chip>
      <span className='llmh-insp__row-summary'>{event.summary}</span>
      {event.source_turns.length > 0 && (
        <MetricLabel size='xs'>src=[{event.source_turns.join(',')}]</MetricLabel>
      )}
    </div>
  );
}

export function ExtractorInspector({ firing, bundle }: Props): ReactElement {
  const { selection, set } = useCaseSelection();
  const payload = firing.input.payload;
  // collector writes summary_threshold as a sibling of payload (see
  // llmharness.aggregate.collector._firing_input_payload); older
  // captures kept it inside payload — read from either.
  const summaryThreshold =
    (firing.input as { summary_threshold?: unknown }).summary_threshold ??
    (payload as { summary_threshold?: unknown }).summary_threshold ??
    null;
  const output = firing.output;

  const citedByFinding = useMemo<Set<number>>(() => {
    if (!selection.findingId) {
      return new Set();
    }
    const aud = bundle.auditor.find(
      (a) => a.sequence === selection.findingId?.auditorSeq,
    );
    const f = aud?.input.findings.find(
      (x) => x.index === selection.findingId?.index,
    );
    return new Set(f?.related_event_ids ?? []);
  }, [selection.findingId, bundle.auditor]);

  return (
    <div className='llmh-insp'>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>input.payload</span>
          <MetricLabel size='xs'>
            new_turns={payload.new_turns.length}
            {summaryThreshold !== null && ` · threshold=${String(summaryThreshold)}`}
          </MetricLabel>
        </header>
        {payload.recent_graph && payload.recent_graph.length > 0 && (
          <details className='llmh-insp__details'>
            <summary>recent_graph ({payload.recent_graph.length})</summary>
            <pre className='llmh-insp__pre'>
              {JSON.stringify(payload.recent_graph, null, 2)}
            </pre>
          </details>
        )}
        {payload.case_brief && (
          <details className='llmh-insp__details'>
            <summary>case_brief</summary>
            <pre className='llmh-insp__pre'>{payload.case_brief}</pre>
          </details>
        )}
      </section>

      {output ? (
        <>
          <section className='llmh-insp__section'>
            <header className='llmh-insp__sec-head'>
              <span>output.graph</span>
              <MetricLabel size='xs'>
                {output.events.length} events · {output.edges.length} edges
              </MetricLabel>
            </header>
            <EventGraphView
              events={output.events}
              edges={output.edges}
              selectedEventId={selection.eventId}
              onSelectEvent={(id) => {
                set({ eventId: id });
              }}
              onSelectTurn={(turnIndex) => {
                set({ turn: turnIndex });
              }}
            />
          </section>

          <details className='llmh-insp__section'>
            <summary>
              <span className='llmh-insp__sec-head'>
                events &amp; edges (list)
                <MetricLabel size='xs'>
                  {output.events.length} / {output.edges.length}
                </MetricLabel>
              </span>
            </summary>
            <div style={{ marginTop: 'var(--space-2)' }}>
              {output.events.map((ev) => (
                <ExtractorEventRow
                  key={ev.id}
                  event={ev}
                  cited={citedByFinding.has(ev.id)}
                />
              ))}
              {output.edges.map((edge, i) => (
                <div
                  key={`edge-${i.toString()}`}
                  className='llmh-insp__row'
                >
                  <MonoValue size='sm'>
                    #{edge.src} → #{edge.dst}
                  </MonoValue>
                  <Chip tone='default'>{edge.kind}</Chip>
                  {edge.reason && (
                    <span className='llmh-insp__row-summary'>
                      {edge.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>

          {output.dropped_edges.length > 0 && (
            <section className='llmh-insp__section llmh-insp__section--warn'>
              <header className='llmh-insp__sec-head'>
                <span>output.dropped_edges</span>
                <Chip tone='warning'>{output.dropped_edges.length}</Chip>
              </header>
              {output.dropped_edges.map((d, i) => (
                <div key={i} className='llmh-insp__pre'>
                  <strong>{d.reason}</strong>
                  {d.raw !== undefined && (
                    <>
                      {'\n'}
                      {JSON.stringify(d.raw, null, 2)}
                    </>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <EmptyState
          title={firing.status}
          description={firing.error ?? 'no output'}
        />
      )}

      {selection.eventId !== null && (
        <div className='llmh-insp__chip-row'>
          <Chip
            tone='ghost'
            onClick={() => {
              set({ eventId: null, findingId: null });
            }}
          >
            clear event selection
          </Chip>
        </div>
      )}
    </div>
  );
}
