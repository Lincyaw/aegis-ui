/**
 * ReactFlow-backed graph view for the events + edges produced by one
 * extractor firing (or, when caller passes a graph snapshot, the
 * accumulated graph up to that firing).
 *
 * Layout: dagre top-to-bottom DAG. Parents sit above children so real
 * branches (a node with out-degree > 1) and merges (in-degree > 1) read
 * visually the way they actually are — not zigzagged across a turn-axis
 * timeline. Reads top-down so the orientation matches the chat
 * transcript on the left.
 */
import { useMemo } from 'react';
import {
  graphlib as dagreGraphlib,
  layout as dagreLayout,
  type GraphLabel as DagreGraphLabel,
} from '@dagrejs/dagre';
import ReactFlow, {
  Background,
  Controls,
  Position,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { EmptyState } from '@lincyaw/aegis-ui';

import type { ExtractorEvent, GraphEdge } from '../schemas';

import { EventNode, type EventNodeData } from './EventNode';

import './EventGraphView.css';

interface EventGraphViewProps {
  events: ExtractorEvent[];
  edges: GraphEdge[];
  selectedEventId: number | null;
  /**
   * When rendering a cumulative snapshot, the ids produced by *this*
   * firing — they're outlined so reviewers can still tell what changed
   * vs. what carried over.
   */
  newEventIds?: Set<number> | null;
  onSelectEvent?: (id: number) => void;
  onSelectTurn?: (turnIndex: number) => void;
  /** Optional fixed height; defaults via CSS. */
  height?: number;
}

const NODE_TYPES: NodeTypes = { event: EventNode };

// Dagre needs concrete per-node box sizes to space rows without
// overlap. We let nodes grow to fit their summary text, so we estimate
// each node's rendered height from the summary length rather than
// hardcoding one global value. Constants are tuned to the CSS in
// `EventNode.css` (320px wide, ~11px line, ~1.45 line-height ⇒ ~16px /
// line, ~38-40 chars / line at the current font stack).
const NODE_WIDTH = 320;
const NODE_HEAD_HEIGHT = 36; // kind chip + id + turn chip + bottom gap
const NODE_LINE_HEIGHT = 16;
const NODE_CHARS_PER_LINE = 40;
const NODE_MIN_HEIGHT = 80;
const NODE_BOTTOM_PAD = 16;

function estimateNodeHeight(summary: string): number {
  const lineEstimate = Math.max(
    1,
    Math.ceil(summary.length / NODE_CHARS_PER_LINE),
  );
  // Hard-wraps add 1 implicit line per newline already in the string.
  const newlines = (summary.match(/\n/g) ?? []).length;
  const lines = lineEstimate + newlines;
  return Math.max(
    NODE_MIN_HEIGHT,
    NODE_HEAD_HEIGHT + lines * NODE_LINE_HEIGHT + NODE_BOTTOM_PAD,
  );
}

/**
 * Cumulative snapshots reuse local ids across firings — event #1 at turn 0
 * is a different entity than event #1 at turn 4. Disambiguate every node
 * (and edge endpoint) by composing `${min(source_turns)}-${id}`.
 */
function nodeKeyOf(event: ExtractorEvent): string {
  const t =
    event.source_turns.length > 0 ? Math.min(...event.source_turns) : -1;
  return `${t.toString()}-${event.id.toString()}`;
}

function endpointKey(id: number, turns: number[] | undefined): string {
  const t = turns && turns.length > 0 ? Math.min(...turns) : -1;
  return `${t.toString()}-${id.toString()}`;
}

function layoutNodes(
  events: ExtractorEvent[],
  edges: GraphEdge[],
): Map<string, { x: number; y: number }> {
  const g = new dagreGraphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 32,
    ranksep: 64,
    marginx: 16,
    marginy: 16,
  } as DagreGraphLabel);
  g.setDefaultEdgeLabel(() => ({}));

  for (const e of events) {
    g.setNode(nodeKeyOf(e), {
      width: NODE_WIDTH,
      height: estimateNodeHeight(e.summary),
    });
  }
  for (const ed of edges) {
    const srcTurns = (ed as { src_turns?: number[] }).src_turns;
    const dstTurns = (ed as { dst_turns?: number[] }).dst_turns;
    g.setEdge(endpointKey(ed.src, srcTurns), endpointKey(ed.dst, dstTurns));
  }

  dagreLayout(g);

  const out = new Map<string, { x: number; y: number }>();
  for (const e of events) {
    const key = nodeKeyOf(e);
    const n = g.node(key);
    if (n) {
      // dagre returns centroid; ReactFlow expects top-left.
      out.set(key, {
        x: n.x - NODE_WIDTH / 2,
        y: n.y - estimateNodeHeight(e.summary) / 2,
      });
    }
  }
  return out;
}

export function EventGraphView({
  events,
  edges,
  selectedEventId,
  newEventIds,
  onSelectEvent,
  onSelectTurn,
  height,
}: EventGraphViewProps) {
  const nodes: Array<RFNode<EventNodeData>> = useMemo(() => {
    const pos = layoutNodes(events, edges);
    return events.map((e) => {
      const key = nodeKeyOf(e);
      return {
        id: key,
        type: 'event',
        position: pos.get(key) ?? { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          id: e.id,
          kind: String(e.kind),
          summary: e.summary,
          source_turns: e.source_turns,
          highlighted: selectedEventId === e.id,
          isNew: newEventIds?.has(e.id) ?? false,
          onSelect: onSelectEvent,
          onSelectTurn,
        },
      };
    });
  }, [events, edges, selectedEventId, newEventIds, onSelectEvent, onSelectTurn]);

  const rfEdges: RFEdge[] = useMemo(
    () =>
      edges.map((ed, i) => {
        const srcTurns = (ed as { src_turns?: number[] }).src_turns;
        const dstTurns = (ed as { dst_turns?: number[] }).dst_turns;
        const source = endpointKey(ed.src, srcTurns);
        const target = endpointKey(ed.dst, dstTurns);
        return {
          id: `e-${i.toString()}-${source}-${target}`,
          source,
          target,
          label: ed.reason ? ed.reason.slice(0, 32) : ed.kind,
          animated:
            selectedEventId !== null &&
            (ed.src === selectedEventId || ed.dst === selectedEventId),
          style: {
            stroke:
              ed.kind === 'ref' ? 'var(--accent-warning)' : 'var(--text-muted)',
          },
          labelStyle: {
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fill: 'var(--text-muted)',
          },
        };
      }),
    [edges, selectedEventId],
  );

  if (events.length === 0) {
    return (
      <EmptyState
        title='Empty graph'
        description='No events in this firing output.'
      />
    );
  }

  const style = height ? { height: `${height.toString()}px` } : undefined;

  return (
    <div className='llmh-graph' style={style}>
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
