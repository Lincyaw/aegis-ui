/**
 * ReactFlow-backed graph view.
 *
 * Layout strategy: simple layered. x by min(source_turns) (so the agent's
 * timeline reads left-to-right), y stacked within each column by kind.
 * Good enough for the case sizes we deal with (< 100 nodes); replace with
 * dagre/elk if cases grow.
 */

import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeTypes,
} from 'reactflow';

import 'reactflow/dist/style.css';

import { EmptyState } from '@lincyaw/aegis-ui';

import type { GraphEdge, GraphEvent } from '../types';

import { EventNode, type EventNodeData } from './EventNode';

import './EventGraphView.css';

interface EventGraphViewProps {
  events: GraphEvent[];
  edges: GraphEdge[];
  selectedEventId: number | null;
  onSelectEvent?: (id: number) => void;
  onSelectTurn?: (turnIndex: number) => void;
}

const NODE_TYPES: NodeTypes = { event: EventNode };

const KIND_LANE: Record<string, number> = {
  task: 0,
  hyp: 1,
  evid: 2,
  act: 3,
  dec: 4,
  concl: 5,
};

const COL_WIDTH = 280;
const ROW_HEIGHT = 130;

function laneOf(kind: string): number {
  return KIND_LANE[kind] ?? 6;
}

function colOf(event: GraphEvent): number {
  if (event.source_turns.length === 0) return 0;
  return Math.min(...event.source_turns);
}

function positionEvents(events: GraphEvent[]): Map<number, { x: number; y: number }> {
  // Bucket by column (min source turn).
  const byCol = new Map<number, GraphEvent[]>();
  for (const e of events) {
    const c = colOf(e);
    const arr = byCol.get(c) ?? [];
    arr.push(e);
    byCol.set(c, arr);
  }
  const sortedCols = [...byCol.keys()].sort((a, b) => a - b);
  const colIndex = new Map<number, number>();
  sortedCols.forEach((c, i) => colIndex.set(c, i));

  const out = new Map<number, { x: number; y: number }>();
  for (const [col, list] of byCol) {
    list.sort((a, b) => {
      const dl = laneOf(a.kind) - laneOf(b.kind);
      if (dl !== 0) return dl;
      return a.id - b.id;
    });
    list.forEach((e, i) => {
      const cIdx = colIndex.get(col) ?? 0;
      out.set(e.id, { x: cIdx * COL_WIDTH, y: i * ROW_HEIGHT });
    });
  }
  return out;
}

export function EventGraphView({
  events,
  edges,
  selectedEventId,
  onSelectEvent,
  onSelectTurn,
}: EventGraphViewProps) {
  const nodes: Array<RFNode<EventNodeData>> = useMemo(() => {
    const pos = positionEvents(events);
    return events.map((e) => ({
      id: String(e.id),
      type: 'event',
      position: pos.get(e.id) ?? { x: 0, y: 0 },
      data: {
        id: e.id,
        kind: String(e.kind),
        summary: e.summary,
        source_turns: e.source_turns,
        highlighted: selectedEventId === e.id,
        onSelect: onSelectEvent,
        onSelectTurn,
      },
    }));
  }, [events, selectedEventId, onSelectEvent, onSelectTurn]);

  const rfEdges: RFEdge[] = useMemo(
    () =>
      edges.map((ed, i) => ({
        id: `e-${i}-${ed.src}-${ed.dst}`,
        source: String(ed.src),
        target: String(ed.dst),
        label: ed.reason ? ed.reason.slice(0, 24) : ed.kind,
        animated:
          selectedEventId !== null &&
          (ed.src === selectedEventId || ed.dst === selectedEventId),
        style: {
          stroke: ed.kind === 'ref' ? 'var(--accent-info)' : 'var(--text-muted)',
        },
        labelStyle: {
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fill: 'var(--text-muted)',
        },
      })),
    [edges, selectedEventId],
  );

  if (events.length === 0) {
    return <EmptyState title='Empty graph' description='No events in this snapshot.' />;
  }

  return (
    <div className='llmh-graph'>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
