import { type ReactNode, useEffect, useState } from 'react';

import {
  Chip,
  CodeBlock,
  EmptyState,
  ErrorState,
  KeyValueList,
  Markdown,
  MetricLabel,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import type { CaseRepo } from '../../repo';
import type { FiringFile, GraphSnapshotFile, VerdictRow } from '../../types';
import { EventGraphView } from '../EventGraphView';

import { type FiringEntry, FiringList } from './FiringList';

import './AuditorTab.css';

interface AuditorTabProps {
  repo: CaseRepo | null;
  caseId: string;
  auditorFirings: FiringEntry[];
  extractorFirings: FiringEntry[];
  verdicts: VerdictRow[];
  selectedSequence: number | null;
  onSelectSequence: (sequence: number) => void;
  firing: FiringFile | null;
  firingError: string | null;
  selectedEventId: number | null;
  onSelectEvent: (id: number) => void;
}

interface AuditorOutput {
  surface_reminder?: boolean;
  reminder_text?: string;
  matched_event_ids?: number[];
  continuation_notes?: string[];
}

function pickReviewedSnapshot(
  auditor: FiringFile,
  extractors: FiringEntry[]
): FiringEntry | null {
  // Pick the latest extractor with turn_index <= auditor.turn_index.
  const candidates = extractors
    .filter((f) => f.status === 'ok' && f.turnIndex <= auditor.turn_index)
    .sort((a, b) => b.sequence - a.sequence);
  return candidates[0] ?? null;
}

function VerdictPanel({
  firing,
  selectedEventId,
  onSelectEvent,
}: {
  firing: FiringFile;
  selectedEventId: number | null;
  onSelectEvent: (id: number) => void;
}): ReactNode {
  const out = firing.output as AuditorOutput | null;
  if (!out) {
    return <MetricLabel size='xs'>No verdict output.</MetricLabel>;
  }
  const reminder = out.reminder_text ?? '';
  const hasMultiline = reminder.includes('\n');
  return (
    <div className='llmh-auditor__verdict'>
      <KeyValueList
        items={[
          {
            k: 'surface_reminder',
            v: out.surface_reminder ? (
              <Chip tone='warning'>surfaced</Chip>
            ) : (
              <Chip tone='ghost'>silent</Chip>
            ),
          },
        ]}
      />
      <div className='llmh-auditor__section'>
        <MetricLabel size='xs'>reminder_text</MetricLabel>
        {reminder.length === 0 ? (
          <MetricLabel size='xs'>—</MetricLabel>
        ) : hasMultiline ? (
          <Markdown>{reminder}</Markdown>
        ) : (
          <div className='llmh-auditor__reminder'>{reminder}</div>
        )}
      </div>
      {out.matched_event_ids && out.matched_event_ids.length > 0 && (
        <div className='llmh-auditor__section'>
          <MetricLabel size='xs'>matched_event_ids</MetricLabel>
          <div className='llmh-auditor__chip-row'>
            {out.matched_event_ids.map((id) => (
              <Chip
                key={id}
                tone={id === selectedEventId ? 'ink' : 'default'}
                onClick={() => {
                  onSelectEvent(id);
                }}
              >
                {id}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {out.continuation_notes && out.continuation_notes.length > 0 && (
        <div className='llmh-auditor__section'>
          <MetricLabel size='xs'>continuation_notes</MetricLabel>
          <ul className='llmh-auditor__notes'>
            {out.continuation_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      <details className='llmh-auditor__raw'>
        <summary>Raw input</summary>
        <CodeBlock
          language='json'
          code={JSON.stringify(firing.input, null, 2)}
        />
      </details>
    </div>
  );
}

export function AuditorTab({
  repo,
  caseId,
  auditorFirings,
  extractorFirings,
  verdicts,
  selectedSequence,
  onSelectSequence,
  firing,
  firingError,
  selectedEventId,
  onSelectEvent,
}: AuditorTabProps) {
  const [snapshot, setSnapshot] = useState<
    GraphSnapshotFile | null | undefined
  >(undefined);
  const [snapshotMeta, setSnapshotMeta] = useState<FiringEntry | null>(null);

  useEffect(() => {
    if (!repo || !firing || firing.phase !== 'auditor') {
      setSnapshot(undefined);
      setSnapshotMeta(null);
      return;
    }
    const reviewed = pickReviewedSnapshot(firing, extractorFirings);
    setSnapshotMeta(reviewed);
    if (!reviewed) {
      setSnapshot(undefined);
      return;
    }
    let cancelled = false;
    setSnapshot(null);
    repo
      .readSnapshot(caseId, reviewed.sequence)
      .then((s) => {
        if (!cancelled) {
          setSnapshot(s ?? undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repo, caseId, firing, extractorFirings]);

  return (
    <div className='llmh-auditor'>
      <aside className='llmh-auditor__rail'>
        <SectionDivider>
          Auditor firings ({auditorFirings.length})
        </SectionDivider>
        <FiringList
          firings={auditorFirings}
          selectedSequence={selectedSequence}
          onSelect={onSelectSequence}
          renderTrailing={(f) => {
            const v = verdicts.find((vv) => vv.sequence === f.sequence);
            const surfaced = Boolean(v?.surface_reminder);
            return surfaced ? (
              <Chip tone='warning'>surfaced</Chip>
            ) : (
              <Chip tone='ghost'>silent</Chip>
            );
          }}
          emptyTitle='No auditor firings'
        />
      </aside>
      <section className='llmh-auditor__detail'>
        {!firing && !firingError && (
          <EmptyState
            title='No firing selected'
            description='Pick a firing from the rail.'
          />
        )}
        {firingError && (
          <ErrorState title='Failed to load firing' description={firingError} />
        )}
        {firing && (
          <div className='llmh-auditor__cols'>
            <div className='llmh-auditor__graph-col'>
              <SectionDivider>
                {snapshotMeta
                  ? `Snapshot at turn ${snapshotMeta.turnIndex} (after extractor #${snapshotMeta.sequence})`
                  : 'No snapshot available before this audit'}
              </SectionDivider>
              {snapshot === null && (
                <MetricLabel size='xs'>Loading snapshot…</MetricLabel>
              )}
              {snapshot === undefined && !snapshotMeta && (
                <EmptyState
                  title='No snapshot available'
                  description='No prior extractor snapshot for this audit turn.'
                />
              )}
              {snapshot && (
                <EventGraphView
                  events={snapshot.events}
                  edges={snapshot.edges}
                  selectedEventId={selectedEventId}
                  onSelectEvent={onSelectEvent}
                />
              )}
            </div>
            <div className='llmh-auditor__verdict-col'>
              <SectionDivider>Verdict</SectionDivider>
              <VerdictPanel
                firing={firing}
                selectedEventId={selectedEventId}
                onSelectEvent={onSelectEvent}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
