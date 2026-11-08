import { type ReactElement, useCallback, useMemo, useState } from 'react';

import { Chip, EmptyState, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import { EventGraphView } from '../components';
import {
  type AuditorFiring,
  type CaseBundle,
  type ExtractorFiring,
  snapshotSeenByAuditor,
} from '../schemas';
import { useCaseSelection } from '../selection';

import { DetailModal } from './DetailModal';
import { useDetailModal } from './detailModalContext';

interface GraphViewportProps {
  bundle: CaseBundle;
}

export function GraphViewport({ bundle }: GraphViewportProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const { openDetail, openTurnsList } = useDetailModal();
  const [droppedOpen, setDroppedOpen] = useState(false);

  const orderedExtractors = useMemo<ExtractorFiring[]>(
    () => [...bundle.extractor].sort((a, b) => a.sequence - b.sequence),
    [bundle.extractor]
  );
  const orderedAuditors = useMemo<AuditorFiring[]>(
    () => [...bundle.auditor].sort((a, b) => a.sequence - b.sequence),
    [bundle.auditor]
  );

  const extractorFiring =
    selection.mode === 'extractor' && selection.extractorSeq !== null
      ? orderedExtractors.find((f) => f.sequence === selection.extractorSeq)
      : undefined;
  const auditorFiring =
    selection.mode === 'auditor' && selection.auditorSeq !== null
      ? orderedAuditors.find((f) => f.sequence === selection.auditorSeq)
      : undefined;

  const onSelectEvent = useCallback(
    (id: number) => {
      set({ eventId: id });
    },
    [set]
  );
  const onOpenEventDetail = useCallback(
    (id: number) => {
      set({ eventId: id });
      openDetail();
    },
    [set, openDetail]
  );

  if (extractorFiring) {
    const output = extractorFiring.output;
    const snapshot = bundle.graphs.get(extractorFiring.sequence);
    const outEvents = output?.events ?? [];
    const outEdges = output?.edges ?? [];
    const graphEvents = snapshot?.events ?? outEvents;
    const graphEdges = snapshot?.edges ?? outEdges;
    const newEventIds = snapshot ? new Set(outEvents.map((e) => e.id)) : null;
    const droppedEdges = output?.dropped_edges ?? [];
    const idx = orderedExtractors.findIndex(
      (f) => f.sequence === extractorFiring.sequence
    );
    const prev = idx > 0 ? orderedExtractors[idx - 1] : undefined;
    const next =
      idx >= 0 && idx < orderedExtractors.length - 1
        ? orderedExtractors[idx + 1]
        : undefined;
    return (
      <div className='llmh-cdp__viewport'>
        <header className='llmh-cdp__viewport-bar'>
          <MonoValue size='sm'>
            E#{extractorFiring.sequence} / {orderedExtractors.length}
          </MonoValue>
          <MetricLabel size='xs'>
            {graphEvents.length} events · {graphEdges.length} edges
            {snapshot ? ` · +${outEvents.length.toString()} new` : ''}
          </MetricLabel>
          <div className='llmh-cdp__viewport-spacer' />
          {prev && (
            <Chip
              tone='default'
              onClick={() => {
                set({ extractorSeq: prev.sequence, eventId: null });
              }}
            >
              ← E#{prev.sequence}
            </Chip>
          )}
          {next && (
            <Chip
              tone='default'
              onClick={() => {
                set({ extractorSeq: next.sequence, eventId: null });
              }}
            >
              E#{next.sequence} →
            </Chip>
          )}
          {droppedEdges.length > 0 && (
            <Chip
              tone='caution'
              onClick={() => {
                setDroppedOpen(true);
              }}
            >
              {droppedEdges.length} dropped
            </Chip>
          )}
        </header>
        <div className='llmh-cdp__viewport-graph'>
          <EventGraphView
            events={graphEvents}
            edges={graphEdges}
            selectedEventId={selection.eventId}
            newEventIds={newEventIds}
            onSelectEvent={onSelectEvent}
            onOpenTurns={openTurnsList}
            onOpenDetail={onOpenEventDetail}
          />
        </div>
        <DetailModal
          title={`Dropped edges · E#${extractorFiring.sequence.toString()}`}
          open={droppedOpen}
          onClose={() => {
            setDroppedOpen(false);
          }}
        >
          <div className='llmh-insp'>
            <section className='llmh-insp__section'>
              <header className='llmh-insp__sec-head'>
                <span>output.dropped_edges</span>
                <MetricLabel size='xs'>{droppedEdges.length}</MetricLabel>
              </header>
              {droppedEdges.map((d, i) => (
                <div key={i} className='llmh-insp__pre'>
                  <strong>
                    #{d.src} → #{d.dst} · {d.kind}
                  </strong>
                  {'\n'}
                  {d.last_error}
                </div>
              ))}
            </section>
          </div>
        </DetailModal>
      </div>
    );
  }

  if (auditorFiring) {
    const seen = auditorFiring.input.payload.graph.length;
    const snapshot = snapshotSeenByAuditor(bundle.graphs, auditorFiring);
    const idx = orderedAuditors.findIndex(
      (f) => f.sequence === auditorFiring.sequence
    );
    const prev = idx > 0 ? orderedAuditors[idx - 1] : undefined;
    const next =
      idx >= 0 && idx < orderedAuditors.length - 1
        ? orderedAuditors[idx + 1]
        : undefined;
    return (
      <div className='llmh-cdp__viewport'>
        <header className='llmh-cdp__viewport-bar'>
          <MonoValue size='sm'>
            A#{auditorFiring.sequence} / {orderedAuditors.length}
          </MonoValue>
          <MetricLabel size='xs'>
            {snapshot
              ? `${snapshot.events.length.toString()} events · ${snapshot.edges.length.toString()} edges (E#${snapshot.after_extractor_firing.toString()})`
              : `${seen.toString()} events · no matching snapshot`}
          </MetricLabel>
          <div className='llmh-cdp__viewport-spacer' />
          {prev && (
            <Chip
              tone='default'
              onClick={() => {
                set({ auditorSeq: prev.sequence, eventId: null });
              }}
            >
              ← A#{prev.sequence}
            </Chip>
          )}
          {next && (
            <Chip
              tone='default'
              onClick={() => {
                set({ auditorSeq: next.sequence, eventId: null });
              }}
            >
              A#{next.sequence} →
            </Chip>
          )}
        </header>
        <div className='llmh-cdp__viewport-graph'>
          {snapshot ? (
            <EventGraphView
              events={snapshot.events}
              edges={snapshot.edges}
              selectedEventId={selection.eventId}
              newEventIds={null}
              onSelectEvent={onSelectEvent}
              onOpenTurns={openTurnsList}
              onOpenDetail={onOpenEventDetail}
            />
          ) : (
            <EmptyState
              title='No graph snapshot'
              description={`No event_graph snapshot up to turn ${auditorFiring.turn_index.toString()} matches the ${seen.toString()} events this auditor saw.`}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='llmh-cdp__viewport'>
      <div className='llmh-cdp__viewport-graph'>
        <EmptyState
          title='Pick a firing'
          description='Click E#n or A#n in the timeline above to view its event graph.'
        />
      </div>
    </div>
  );
}
