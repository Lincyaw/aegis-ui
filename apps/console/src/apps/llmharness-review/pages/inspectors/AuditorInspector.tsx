/**
 * Inspector pane shown when selection.mode === 'auditor'. The point of
 * this view is auditing whether the auditor's verdict was reasonable
 * GIVEN the event graph it actually saw — so we render that graph
 * snapshot first (bundle.graphs.get(firing.input.graph_snapshot_ref)),
 * then the findings + output. The Main column still scrolls / highlights
 * the auditor's turn, so the reviewer can triangulate.
 */

import { type ReactElement } from 'react';

import {
  Chip,
  EmptyState,
  MetricLabel,
  MonoValue,
} from '@lincyaw/aegis-ui';

import type {
  AuditorFiring,
  CaseBundle,
  ExtractorEvent,
  Finding,
} from '../../schemas';
import { useCaseSelection } from '../../selection';

import './Inspector.css';

interface Props {
  firing: AuditorFiring;
  bundle: CaseBundle;
}

function GraphEventRow({ event }: { event: ExtractorEvent }): ReactElement {
  const { selection, set } = useCaseSelection();
  const selected = selection.eventId === event.id;
  const cls = [
    'llmh-insp__row',
    selected ? 'llmh-insp__row--selected' : '',
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

function FindingRow({
  finding,
  firing,
}: {
  finding: Finding;
  firing: AuditorFiring;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const selected =
    selection.findingId?.auditorSeq === firing.sequence &&
    selection.findingId.index === finding.index;
  const cls = [
    'llmh-insp__finding',
    selected ? 'llmh-insp__finding--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      role='button'
      tabIndex={0}
      onClick={() => {
        set({
          findingId: { auditorSeq: firing.sequence, index: finding.index },
        });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          set({
            findingId: { auditorSeq: firing.sequence, index: finding.index },
          });
        }
      }}
    >
      <div className='llmh-insp__finding-head'>
        <MonoValue size='sm'>F#{finding.index}</MonoValue>
        <Chip tone='default'>{finding.kind}</Chip>
      </div>
      <span>{finding.summary}</span>
      {finding.related_event_ids.length > 0 && (
        <div className='llmh-insp__chip-row'>
          {finding.related_event_ids.map((id) => (
            <span
              key={id}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              role='presentation'
            >
              <Chip
                tone={selection.eventId === id ? 'ink' : 'default'}
                onClick={() => {
                  set({ eventId: id });
                }}
              >
                #{id}
              </Chip>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditorInspector({ firing, bundle }: Props): ReactElement {
  const { selection, set } = useCaseSelection();
  const input = firing.input;
  const output = firing.output;
  const checkErrorKeys = Object.keys(input.check_errors);
  const snapshot = bundle.graphs.get(input.graph_snapshot_ref);
  const surfaced = Boolean(output?.surface_reminder);

  return (
    <div className='llmh-insp'>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>context</span>
          <MetricLabel size='xs'>
            profile={input.tools_profile} · traj=
            {input.trajectory_snapshot_len.toString()}
          </MetricLabel>
        </header>
        <div className='llmh-insp__chip-row'>
          <span>graph snapshot:</span>
          <Chip
            tone='default'
            onClick={() => {
              set({
                mode: 'extractor',
                extractorSeq: input.graph_snapshot_ref,
                auditorSeq: null,
                turn: null,
              });
            }}
          >
            E#{input.graph_snapshot_ref} →
          </Chip>
        </div>
      </section>

      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>graph (auditor&apos;s view)</span>
          <MetricLabel size='xs'>
            {snapshot
              ? `${snapshot.events.length.toString()} events · ${snapshot.edges.length.toString()} edges`
              : 'snapshot missing'}
          </MetricLabel>
        </header>
        {!snapshot ? (
          <EmptyState
            title='No graph snapshot'
            description={`bundle.graphs has no entry for E#${input.graph_snapshot_ref.toString()}`}
          />
        ) : snapshot.events.length === 0 ? (
          <EmptyState title='No events at this snapshot' />
        ) : (
          snapshot.events.map((ev) => <GraphEventRow key={ev.id} event={ev} />)
        )}
      </section>

      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>input.findings</span>
          <MetricLabel size='xs'>{input.findings.length}</MetricLabel>
        </header>
        {input.findings.length === 0 ? (
          <EmptyState title='No findings' />
        ) : (
          input.findings.map((f) => (
            <FindingRow key={f.index} finding={f} firing={firing} />
          ))
        )}
      </section>

      {input.continuation_notes.length > 0 && (
        <section className='llmh-insp__section'>
          <header className='llmh-insp__sec-head'>
            <span>continuation_notes</span>
          </header>
          {input.continuation_notes.map((n, i) => (
            <div key={i} className='llmh-insp__pre'>
              {n}
            </div>
          ))}
        </section>
      )}

      {checkErrorKeys.length > 0 && (
        <details className='llmh-insp__details'>
          <summary>check_errors ({checkErrorKeys.length})</summary>
          <pre className='llmh-insp__pre'>
            {JSON.stringify(input.check_errors, null, 2)}
          </pre>
        </details>
      )}

      <section
        className={[
          'llmh-insp__section',
          surfaced ? 'llmh-insp__section--surfaced' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <header className='llmh-insp__sec-head'>
          <span>output</span>
          {output && (
            <Chip tone={surfaced ? 'warning' : 'ghost'}>
              {surfaced ? '★ surfaced' : 'silent'}
            </Chip>
          )}
        </header>
        {!output ? (
          <EmptyState
            title={firing.status}
            description={firing.error ?? 'no output'}
          />
        ) : (
          <>
            {output.reminder_text && (
              <div className='llmh-insp__pre'>{output.reminder_text}</div>
            )}
            {output.matched_event_ids && output.matched_event_ids.length > 0 && (
              <div className='llmh-insp__chip-row'>
                <span>matched:</span>
                {output.matched_event_ids.map((id) => (
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
          </>
        )}
      </section>
    </div>
  );
}
