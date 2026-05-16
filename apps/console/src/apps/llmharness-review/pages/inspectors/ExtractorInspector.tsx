/**
 * Right-rail meta view for the currently selected extractor firing.
 *
 * The graph itself is now hosted by CaseDetailPage's main viewport, so
 * this component renders only the firing's surrounding context:
 * input.payload summary, recent_graph / case_brief peeks, dropped_edges,
 * and the "clear event" affordance. Event/edge tables have moved out
 * since the graph supersedes them.
 */

import { type ReactElement } from 'react';

import { Chip, EmptyState, MetricLabel } from '@lincyaw/aegis-ui';

import type { CaseBundle, ExtractorFiring } from '../../schemas';
import { useCaseSelection } from '../../selection';

import './Inspector.css';

interface Props {
  firing: ExtractorFiring;
  bundle: CaseBundle;
}

export function ExtractorInspector({ firing }: Props): ReactElement {
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
  const outDroppedEdges = output?.dropped_edges ?? [];

  return (
    <div className='llmh-insp'>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>firing</span>
          <MetricLabel size='xs'>
            E#{firing.sequence} · turn={firing.turn_index} · status=
            {firing.status}
          </MetricLabel>
        </header>
        {output ? (
          <MetricLabel size='xs'>
            {output.events.length} new events · {output.edges.length} new edges
            {outDroppedEdges.length > 0
              ? ` · ${outDroppedEdges.length.toString()} dropped`
              : ''}
          </MetricLabel>
        ) : (
          <EmptyState
            title={firing.status}
            description={firing.error ?? 'no output'}
          />
        )}
      </section>

      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>input.payload</span>
          <MetricLabel size='xs'>
            new_turns={payload.new_turns.length}
            {summaryThreshold !== null &&
              ` · threshold=${String(summaryThreshold)}`}
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

      {outDroppedEdges.length > 0 && (
        <section
          id='llmh-insp__dropped'
          className='llmh-insp__section llmh-insp__section--warn'
        >
          <header className='llmh-insp__sec-head'>
            <span>output.dropped_edges</span>
            <Chip tone='warning'>{outDroppedEdges.length}</Chip>
          </header>
          {outDroppedEdges.map((d, i) => (
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
