import { type ReactNode, useState } from 'react';

import {
  Chip,
  CodeBlock,
  KeyValueList,
  MetricLabel,
  SectionDivider,
  Tabs,
  type TabItem,
} from '@lincyaw/aegis-ui';

import type { FiringFile, GraphEdge, GraphEvent, GraphSnapshotFile } from '../types';

import { EventGraphView } from './EventGraphView';

import './FiringDetail.css';

interface FiringDetailProps {
  firing: FiringFile;
  /** Auditor-only: which event id is currently highlighted in the linked
   * extractor view. We use it to colour matched chips here so the reviewer
   * sees the live selection. */
  selectedEventId?: number | null;
  /** Fired when the reviewer clicks a matched_event_id chip on an auditor
   * firing, or when an event node is picked in the graph view. */
  onSelectEvent?: (eventId: number) => void;
  /** Reverse jump from a graph node's source_turns chip. */
  onSelectTurn?: (turnIndex: number) => void;
  /** Cumulative graph snapshot AFTER this firing (extractor only). Page
   * loads it lazily; pass null while loading and `undefined` if not
   * applicable / missing. */
  snapshot?: GraphSnapshotFile | null | undefined;
}

interface AuditorOutput {
  surface_reminder?: boolean;
  reminder_text?: string;
  matched_event_ids?: number[];
  continuation_notes?: string[];
}

function summary(firing: FiringFile): string {
  if (firing.status !== 'ok') return firing.error ?? `status: ${firing.status}`;
  if (firing.phase === 'extractor') {
    const out = firing.output ?? {};
    const eventsLen = Array.isArray((out as { events?: unknown[] }).events)
      ? (out as { events: unknown[] }).events.length
      : 0;
    const edgesLen = Array.isArray((out as { edges?: unknown[] }).edges)
      ? (out as { edges: unknown[] }).edges.length
      : 0;
    return `events=${eventsLen} · edges=${edgesLen}`;
  }
  const out = firing.output as AuditorOutput | null;
  if (!out) return 'no output';
  return out.surface_reminder ? `surfaced — ${out.reminder_text ?? '(empty)'}` : 'silent';
}

function VerdictPanel({
  firing,
  selectedEventId,
  onSelectEvent,
}: {
  firing: FiringFile;
  selectedEventId?: number | null;
  onSelectEvent?: (eventId: number) => void;
}): ReactNode {
  const out = firing.output as AuditorOutput | null;
  if (!out) return <MetricLabel size='xs'>No verdict output.</MetricLabel>;
  return (
    <div className='llmh-firing-detail__verdict'>
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
          {
            k: 'reminder_text',
            v: out.reminder_text ?? <MetricLabel size='xs'>—</MetricLabel>,
          },
        ]}
      />
      {out.matched_event_ids && out.matched_event_ids.length > 0 && (
        <div className='llmh-firing-detail__matched'>
          <MetricLabel size='xs'>matched_event_ids</MetricLabel>
          <div className='llmh-firing-detail__chip-row'>
            {out.matched_event_ids.map((id) => (
              <Chip
                key={id}
                tone={id === selectedEventId ? 'ink' : 'default'}
                onClick={onSelectEvent ? () => onSelectEvent(id) : undefined}
              >
                {id}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {out.continuation_notes && out.continuation_notes.length > 0 && (
        <div className='llmh-firing-detail__notes'>
          <MetricLabel size='xs'>continuation_notes</MetricLabel>
          <ul>
            {out.continuation_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function extractorDeltaGraph(firing: FiringFile): {
  events: GraphEvent[];
  edges: GraphEdge[];
} {
  const out = firing.output;
  if (!out || typeof out !== 'object') return { events: [], edges: [] };
  const obj = out as { events?: unknown; edges?: unknown };
  const events = Array.isArray(obj.events) ? (obj.events as GraphEvent[]) : [];
  const edges = Array.isArray(obj.edges) ? (obj.edges as GraphEdge[]) : [];
  return { events, edges };
}

export function FiringDetail({
  firing,
  selectedEventId,
  onSelectEvent,
  onSelectTurn,
  snapshot,
}: FiringDetailProps) {
  const isAuditor = firing.phase === 'auditor';
  const isExtractor = firing.phase === 'extractor';
  const items: TabItem[] = [
    { key: 'input', label: 'Input' },
    { key: 'output', label: 'Output' },
    ...(isAuditor ? [{ key: 'verdict', label: 'Verdict' }] : []),
    ...(isExtractor ? [{ key: 'graph', label: 'Graph (Δ)' }] : []),
    ...(isExtractor ? [{ key: 'after', label: 'After' }] : []),
    { key: 'raw', label: 'Raw' },
  ];
  const defaultTab = isAuditor ? 'verdict' : isExtractor ? 'graph' : 'output';
  const [active, setActive] = useState<string>(defaultTab);

  const delta = isExtractor ? extractorDeltaGraph(firing) : null;

  return (
    <div className='llmh-firing-detail'>
      <KeyValueList
        items={[
          { k: 'phase', v: firing.phase },
          { k: 'sequence', v: `#${firing.sequence}` },
          { k: 'turn_index', v: firing.turn_index },
          { k: 'status', v: firing.status },
          { k: 'latency_ms', v: firing.latency_ms },
          ...(firing.error ? [{ k: 'error', v: firing.error }] : []),
        ]}
      />
      <SectionDivider>{summary(firing)}</SectionDivider>
      <Tabs items={items} activeKey={active} onChange={setActive}>
        {active === 'input' && (
          <CodeBlock language='json' code={JSON.stringify(firing.input, null, 2)} />
        )}
        {active === 'output' && (
          <CodeBlock language='json' code={JSON.stringify(firing.output, null, 2)} />
        )}
        {active === 'verdict' && isAuditor && (
          <VerdictPanel
            firing={firing}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
          />
        )}
        {active === 'graph' && isExtractor && delta && (
          <EventGraphView
            events={delta.events}
            edges={delta.edges}
            selectedEventId={selectedEventId ?? null}
            onSelectEvent={onSelectEvent}
            onSelectTurn={onSelectTurn}
          />
        )}
        {active === 'after' && isExtractor && (
          snapshot === null ? (
            <MetricLabel size='xs'>Loading snapshot…</MetricLabel>
          ) : snapshot === undefined ? (
            <MetricLabel size='xs'>
              No snapshot for this firing (non-ok status, or file missing).
            </MetricLabel>
          ) : (
            <EventGraphView
              events={snapshot.events}
              edges={snapshot.edges}
              selectedEventId={selectedEventId ?? null}
              onSelectEvent={onSelectEvent}
            />
          )
        )}
        {active === 'raw' && (
          <CodeBlock language='json' code={JSON.stringify(firing, null, 2)} />
        )}
      </Tabs>
    </div>
  );
}
