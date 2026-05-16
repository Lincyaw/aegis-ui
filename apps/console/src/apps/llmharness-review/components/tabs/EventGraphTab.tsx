import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  Chip,
  EmptyState,
  MetricLabel,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import type { CaseRepo } from '../../repo';
import type { GraphEdge, GraphEvent, GraphSnapshotFile } from '../../types';
import { EventGraphView } from '../EventGraphView';

import type { FiringEntry } from './FiringList';

import './EventGraphTab.css';

interface EventGraphTabProps {
  repo: CaseRepo | null;
  caseId: string;
  extractorFirings: FiringEntry[];
  selectedStep: number | null;
  onSelectStep: (sequence: number) => void;
}

interface Delta {
  events: GraphEvent[];
  edges: GraphEdge[];
}

function diffSnapshots(
  current: GraphSnapshotFile,
  prev: GraphSnapshotFile | null
): Delta {
  if (!prev) {
    return { events: current.events, edges: current.edges };
  }
  const prevEventIds = new Set(prev.events.map((e) => e.id));
  const prevEdgeKeys = new Set(
    prev.edges.map((e) => `${e.src}->${e.dst}:${String(e.kind)}`)
  );
  return {
    events: current.events.filter((e) => !prevEventIds.has(e.id)),
    edges: current.edges.filter(
      (e) => !prevEdgeKeys.has(`${e.src}->${e.dst}:${String(e.kind)}`)
    ),
  };
}

function DeltaPanel({
  current,
  prev,
}: {
  current: GraphSnapshotFile | null;
  prev: GraphSnapshotFile | null | undefined;
}): ReactNode {
  if (!current) {
    return <MetricLabel size='xs'>Loading…</MetricLabel>;
  }
  if (prev === undefined) {
    // First step: everything is new.
    return (
      <div className='llmh-graph-tab__delta'>
        <MetricLabel size='xs'>
          All {current.events.length} events are new.
        </MetricLabel>
        <ul className='llmh-graph-tab__delta-list'>
          {current.events.map((e) => (
            <li key={`e-${e.id}`}>
              +event #{e.id} ({String(e.kind)})
            </li>
          ))}
          {current.edges.map((ed, i) => (
            <li key={`d-${i}`}>
              +edge {ed.src}→{ed.dst}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (prev === null) {
    return <MetricLabel size='xs'>Loading previous snapshot…</MetricLabel>;
  }
  const delta = diffSnapshots(current, prev);
  if (delta.events.length === 0 && delta.edges.length === 0) {
    return <MetricLabel size='xs'>No changes since previous step.</MetricLabel>;
  }
  return (
    <ul className='llmh-graph-tab__delta-list'>
      {delta.events.map((e) => (
        <li key={`e-${e.id}`}>
          +event #{e.id} ({String(e.kind)})
        </li>
      ))}
      {delta.edges.map((ed, i) => (
        <li key={`d-${i}`}>
          +edge {ed.src}→{ed.dst}
        </li>
      ))}
    </ul>
  );
}

export function EventGraphTab({
  repo,
  caseId,
  extractorFirings,
  selectedStep,
  onSelectStep,
}: EventGraphTabProps) {
  const okFirings = useMemo(
    () => extractorFirings.filter((f) => f.status === 'ok'),
    [extractorFirings]
  );

  const [current, setCurrent] = useState<GraphSnapshotFile | null>(null);
  const [prev, setPrev] = useState<GraphSnapshotFile | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!repo || selectedStep === null) {
      setCurrent(null);
      setPrev(undefined);
      return;
    }
    let cancelled = false;
    setCurrent(null);
    const idx = okFirings.findIndex((f) => f.sequence === selectedStep);
    const prevSeq = idx > 0 ? okFirings[idx - 1].sequence : null;
    if (prevSeq === null) {
      setPrev(undefined);
    } else {
      setPrev(null);
    }
    void Promise.all([
      repo.readSnapshot(caseId, selectedStep),
      prevSeq === null
        ? Promise.resolve(null)
        : repo.readSnapshot(caseId, prevSeq),
    ]).then(([cur, p]) => {
      if (cancelled) {
        return;
      }
      setCurrent(cur);
      if (prevSeq !== null) {
        setPrev(p);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repo, caseId, selectedStep, okFirings]);

  if (okFirings.length === 0) {
    return (
      <EmptyState
        title='No graph snapshots'
        description='No successful extractor firings.'
      />
    );
  }

  return (
    <div className='llmh-graph-tab'>
      <div className='llmh-graph-tab__timeline' role='tablist'>
        {okFirings.map((f, i) => {
          const active = f.sequence === selectedStep;
          return (
            <button
              key={f.sequence}
              type='button'
              role='tab'
              aria-selected={active}
              className={
                active
                  ? 'llmh-graph-tab__step llmh-graph-tab__step--active'
                  : 'llmh-graph-tab__step'
              }
              onClick={() => {
                onSelectStep(f.sequence);
              }}
              title={`#${f.sequence} · turn ${f.turnIndex}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className='llmh-graph-tab__body'>
        <div className='llmh-graph-tab__main'>
          {current ? (
            <>
              <SectionDivider>
                <span className='llmh-graph-tab__title'>
                  After extractor #{current.after_extractor_firing} · turn{' '}
                  {current.turn_index} · {current.events.length} events ·{' '}
                  {current.edges.length} edges
                </span>
              </SectionDivider>
              <EventGraphView
                events={current.events}
                edges={current.edges}
                selectedEventId={null}
              />
            </>
          ) : (
            <EmptyState title='Loading snapshot…' />
          )}
        </div>
        <aside className='llmh-graph-tab__delta-col'>
          <SectionDivider>
            <span className='llmh-graph-tab__title'>
              <Chip tone='ghost'>Δ since previous step</Chip>
            </span>
          </SectionDivider>
          <DeltaPanel current={current} prev={prev} />
        </aside>
      </div>
    </div>
  );
}
