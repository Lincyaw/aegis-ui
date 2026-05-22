/**
 * Extractor view: chat transcript on top, live folded graph on bottom.
 * The graph is materialised by folding the in-order
 * ``llmharness.audit_graph_op`` payloads accumulated on this session's
 * timeline. Most-recently-added node gets a brief highlight ring.
 */

import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { ChatTranscript } from '../components/ChatTranscript';
import { LiveGraphView } from '../components/LiveGraphView';
import { foldOps } from '../graphFold';
import { useSessionTimeline } from '../store/useInspectStream';

import './ExtractorView.css';

const HIGHLIGHT_MS = 1500;

interface Props {
  sessionId: string;
}

export function ExtractorView({ sessionId }: Props): ReactElement {
  const items = useSessionTimeline(sessionId);

  const ops = useMemo(() => {
    const out: Array<Record<string, unknown>> = [];
    for (const it of items) {
      if (it.source === 'entry' && it.entry_type === 'llmharness.audit_graph_op') {
        out.push(it.payload);
      }
    }
    return out;
  }, [items]);

  const phase = useMemo(() => {
    let latest: string | null = null;
    for (const it of items) {
      if (
        it.source === 'entry' &&
        it.entry_type === 'llmharness.audit_phase' &&
        typeof it.payload.kind === 'string'
      ) {
        latest = it.payload.kind;
      }
    }
    return latest;
  }, [items]);

  const folded = useMemo(() => foldOps(ops), [ops]);

  // Highlight the most-recent upsert id briefly after each new op.
  const [highlightId, setHighlightId] = useState<number | null>(null);
  useEffect(() => {
    let lastUpsertId: number | null = null;
    for (let i = ops.length - 1; i >= 0; i -= 1) {
      const op = ops[i];
      if (op.op === 'node_upsert' && typeof op.id === 'number') {
        lastUpsertId = op.id;
        break;
      }
    }
    if (lastUpsertId === null) {
      return;
    }
    setHighlightId(lastUpsertId);
    const t = setTimeout(() => {
      setHighlightId(null);
    }, HIGHLIGHT_MS);
    return (): void => {
      clearTimeout(t);
    };
  }, [ops.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='lh-ext'>
      <div className='lh-ext__head'>
        <span className='lh-ext__tag'>extractor</span>
        {phase && (
          <span className='lh-ext__phase'>phase: {phase}</span>
        )}
        <span className='lh-ext__stat'>
          {folded.events.length.toString()} events ·{' '}
          {folded.edges.length.toString()} edges
        </span>
      </div>
      <div className='lh-ext__chat'>
        <ChatTranscript items={items} />
      </div>
      <div className='lh-ext__graph'>
        <LiveGraphView
          events={folded.events}
          edges={folded.edges}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
