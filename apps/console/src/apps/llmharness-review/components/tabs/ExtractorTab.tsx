import { type ReactNode, useEffect, useState } from 'react';

import {
  Chip,
  CodeBlock,
  EmptyState,
  ErrorState,
  KeyValueList,
  MetricLabel,
  SectionDivider,
  type TabItem,
  Tabs,
} from '@lincyaw/aegis-ui';

import type { CaseRepo } from '../../repo';
import type {
  FiringFile,
  GraphEdge,
  GraphEvent,
  GraphSnapshotFile,
  MainAgentMessage,
} from '../../types';
import { EventGraphView } from '../EventGraphView';
import { MessageBlocks } from '../MessageBlocks';

import { type FiringEntry, FiringList } from './FiringList';

import './ExtractorTab.css';

interface ExtractorTabProps {
  repo: CaseRepo | null;
  caseId: string;
  firings: FiringEntry[];
  selectedSequence: number | null;
  onSelectSequence: (sequence: number) => void;
  firing: FiringFile | null;
  firingError: string | null;
  selectedEventId: number | null;
  onSelectEvent: (id: number) => void;
}

interface ExtractorInput {
  payload?: {
    new_turns?: MainAgentMessage[];
    recent_graph?: GraphEvent[];
  };
}

interface ExtractorOutput {
  events?: GraphEvent[];
  edges?: GraphEdge[];
}

function extractorStatsFromFile(file: FiringFile): {
  events: number;
  edges: number;
} {
  const out = (file.output as ExtractorOutput | null) ?? {};
  return {
    events: Array.isArray(out.events) ? out.events.length : 0,
    edges: Array.isArray(out.edges) ? out.edges.length : 0,
  };
}

function EdgeList({ edges }: { edges: GraphEdge[] }): ReactNode {
  if (edges.length === 0) {
    return <MetricLabel size='xs'>No edges produced.</MetricLabel>;
  }
  return (
    <KeyValueList
      items={edges.map((e, i) => ({
        k: `${i + 1}. ${e.src} → ${e.dst}`,
        v: (
          <span className='llmh-extractor__edge-v'>
            <Chip tone='ghost'>{String(e.kind)}</Chip>
            {e.reason && (
              <span className='llmh-extractor__edge-reason'>{e.reason}</span>
            )}
          </span>
        ),
      }))}
    />
  );
}

function InputPanel({
  firing,
  mode,
}: {
  firing: FiringFile;
  mode: 'pretty' | 'raw';
}): ReactNode {
  if (mode === 'raw') {
    return (
      <CodeBlock language='json' code={JSON.stringify(firing.input, null, 2)} />
    );
  }
  const input = firing.input as ExtractorInput;
  const payload = input.payload ?? {};
  const newTurns = Array.isArray(payload.new_turns) ? payload.new_turns : [];
  const recent = Array.isArray(payload.recent_graph)
    ? payload.recent_graph
    : [];
  return (
    <div className='llmh-extractor__input'>
      <div className='llmh-extractor__section'>
        <MetricLabel size='xs'>new_turns ({newTurns.length})</MetricLabel>
        {newTurns.length === 0 ? (
          <MetricLabel size='xs'>No new turns.</MetricLabel>
        ) : (
          <div className='llmh-extractor__turns'>
            {newTurns.map((msg, i) => (
              <div key={i} className='llmh-extractor__turn'>
                <div className='llmh-extractor__turn-head'>
                  <Chip tone='ghost'>{String(msg.role)}</Chip>
                  {typeof msg.index === 'number' && (
                    <MetricLabel size='xs'>#{msg.index}</MetricLabel>
                  )}
                </div>
                <MessageBlocks content={msg.content} />
              </div>
            ))}
          </div>
        )}
      </div>
      <details className='llmh-extractor__details'>
        <summary>Prior accumulated context ({recent.length} events)</summary>
        <div className='llmh-extractor__events'>
          {recent.map((e) => (
            <EventNodeCard key={e.id} event={e} />
          ))}
        </div>
      </details>
    </div>
  );
}

function EventNodeCard({ event }: { event: GraphEvent }): ReactNode {
  return (
    <div className='llmh-extractor__event-card'>
      <div className='llmh-extractor__event-head'>
        <Chip tone='ghost'>{String(event.kind)}</Chip>
        <span className='llmh-extractor__event-id'>#{event.id}</span>
        {event.source_turns.length > 0 && (
          <MetricLabel size='xs'>
            turn {event.source_turns.join(',')}
          </MetricLabel>
        )}
      </div>
      <div className='llmh-extractor__event-summary'>{event.summary}</div>
    </div>
  );
}

function OutputPanel({
  firing,
  mode,
  snapshot,
  selectedEventId,
  onSelectEvent,
}: {
  firing: FiringFile;
  mode: 'pretty' | 'graph' | 'raw';
  snapshot: GraphSnapshotFile | null | undefined;
  selectedEventId: number | null;
  onSelectEvent: (id: number) => void;
}): ReactNode {
  if (mode === 'raw') {
    return (
      <CodeBlock
        language='json'
        code={JSON.stringify(firing.output, null, 2)}
      />
    );
  }
  const out = (firing.output as ExtractorOutput | null) ?? {};
  const events = Array.isArray(out.events) ? out.events : [];
  const edges = Array.isArray(out.edges) ? out.edges : [];
  if (mode === 'graph') {
    if (snapshot === null) {
      return <MetricLabel size='xs'>Loading cumulative snapshot…</MetricLabel>;
    }
    if (snapshot === undefined) {
      return (
        <EmptyState
          title='No cumulative snapshot'
          description='This firing did not advance the graph (no after_extractor_*.json on disk).'
        />
      );
    }
    return (
      <>
        <MetricLabel size='xs'>
          Cumulative graph after this firing · {snapshot.events.length} events ·{' '}
          {snapshot.edges.length} edges
        </MetricLabel>
        <EventGraphView
          events={snapshot.events}
          edges={snapshot.edges}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
        />
      </>
    );
  }
  return (
    <div className='llmh-extractor__output'>
      <div className='llmh-extractor__section'>
        <MetricLabel size='xs'>events ({events.length})</MetricLabel>
        {events.length === 0 ? (
          <MetricLabel size='xs'>No events.</MetricLabel>
        ) : (
          <div className='llmh-extractor__events'>
            {events.map((e) => (
              <EventNodeCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
      <div className='llmh-extractor__section'>
        <MetricLabel size='xs'>edges ({edges.length})</MetricLabel>
        <EdgeList edges={edges} />
      </div>
    </div>
  );
}

export function ExtractorTab({
  repo,
  caseId,
  firings,
  selectedSequence,
  onSelectSequence,
  firing,
  firingError,
  selectedEventId,
  onSelectEvent,
}: ExtractorTabProps) {
  const [inputMode, setInputMode] = useState<'pretty' | 'raw'>('pretty');
  const [outputMode, setOutputMode] = useState<'pretty' | 'graph' | 'raw'>(
    'graph'
  );
  const [snapshot, setSnapshot] = useState<
    GraphSnapshotFile | null | undefined
  >(undefined);

  useEffect(() => {
    if (
      !repo ||
      !firing ||
      firing.phase !== 'extractor' ||
      firing.status !== 'ok'
    ) {
      setSnapshot(undefined);
      return;
    }
    let cancelled = false;
    setSnapshot(null);
    repo
      .readSnapshot(caseId, firing.sequence)
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
  }, [repo, caseId, firing]);

  const inputItems: TabItem[] = [
    { key: 'pretty', label: 'Pretty' },
    { key: 'raw', label: 'Raw JSON' },
  ];
  const outputItems: TabItem[] = [
    { key: 'pretty', label: 'Pretty' },
    { key: 'graph', label: 'Graph' },
    { key: 'raw', label: 'Raw JSON' },
  ];

  return (
    <div className='llmh-extractor'>
      <aside className='llmh-extractor__rail'>
        <SectionDivider>Extractor firings ({firings.length})</SectionDivider>
        <FiringList
          firings={firings}
          selectedSequence={selectedSequence}
          onSelect={onSelectSequence}
          renderStats={(f) => `${f.fileName}`}
          emptyTitle='No extractor firings'
        />
      </aside>
      <section className='llmh-extractor__detail'>
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
          <>
            <KeyValueList
              items={[
                { k: 'sequence', v: `#${firing.sequence}` },
                { k: 'turn_index', v: firing.turn_index },
                { k: 'status', v: firing.status },
                { k: 'latency_ms', v: firing.latency_ms },
                ...(firing.status === 'ok'
                  ? [
                      {
                        k: 'stats',
                        v: (() => {
                          const s = extractorStatsFromFile(firing);
                          return `events=${s.events} edges=${s.edges}`;
                        })(),
                      },
                    ]
                  : []),
                ...(firing.error ? [{ k: 'error', v: firing.error }] : []),
              ]}
            />
            <div className='llmh-extractor__io'>
              <div className='llmh-extractor__io-col'>
                <SectionDivider>Input</SectionDivider>
                <Tabs
                  items={inputItems}
                  activeKey={inputMode}
                  onChange={(k) => {
                    setInputMode(k as 'pretty' | 'raw');
                  }}
                >
                  <InputPanel firing={firing} mode={inputMode} />
                </Tabs>
              </div>
              <div className='llmh-extractor__io-col'>
                <SectionDivider>Output</SectionDivider>
                <Tabs
                  items={outputItems}
                  activeKey={outputMode}
                  onChange={(k) => {
                    setOutputMode(k as 'pretty' | 'graph' | 'raw');
                  }}
                >
                  <OutputPanel
                    firing={firing}
                    mode={outputMode}
                    snapshot={snapshot}
                    selectedEventId={selectedEventId}
                    onSelectEvent={onSelectEvent}
                  />
                </Tabs>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
