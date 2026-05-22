/**
 * Compact dagre-laid-out graph view for the live folded extractor graph.
 *
 * This is a deliberately smaller cousin of ``llmharness-review``'s
 * ``EventGraphView`` — same dependencies (ReactFlow + @dagrejs/dagre),
 * but only the features the live inspector needs: top-to-bottom DAG,
 * automatic relayout when the topology grows, and a brief highlight on
 * the most-recently-added node. No node detail modal, no source-turn
 * popups — drill-down lives in the chat transcript above the graph.
 */

import {
  memo,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  graphlib as dagreGraphlib,
  layout as dagreLayout,
  type GraphLabel as DagreGraphLabel,
} from '@dagrejs/dagre';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import type { FoldedEdge, FoldedEvent } from '../graphFold';

import './LiveGraphView.css';

interface LiveGraphViewProps {
  events: FoldedEvent[];
  edges: FoldedEdge[];
  highlightId: number | null;
}

interface EventNodeData {
  id: number;
  kind: string;
  summary: string;
  source_turns: number[];
  highlighted: boolean;
}

const NODE_WIDTH = 280;
const NODE_MIN_HEIGHT = 80;
const CHARS_PER_LINE = 36;

function estimateHeight(summary: string): number {
  const lines = Math.max(1, Math.ceil(summary.length / CHARS_PER_LINE));
  return Math.max(NODE_MIN_HEIGHT, 36 + lines * 16 + 16);
}

const EventNodeInner = (props: NodeProps<EventNodeData>): ReactElement => {
  const { data } = props;
  return (
    <div
      className={`lh-gnode lh-gnode--${data.kind} ${
        data.highlighted ? 'lh-gnode--hl' : ''
      }`}
    >
      <Handle type='target' position={Position.Top} />
      <div className='lh-gnode__head'>
        <span className='lh-gnode__kind'>{data.kind}</span>
        <span className='lh-gnode__id'>#{data.id.toString()}</span>
        {data.source_turns.length > 0 && (
          <span className='lh-gnode__turn'>
            turn{' '}
            {data.source_turns.length > 1
              ? `${Math.min(...data.source_turns).toString()}–${Math.max(...data.source_turns).toString()}`
              : data.source_turns[0].toString()}
          </span>
        )}
      </div>
      <div className='lh-gnode__summary'>{data.summary}</div>
      <Handle type='source' position={Position.Bottom} />
    </div>
  );
};
EventNodeInner.displayName = 'LiveEventNode';
const EventNode = memo(EventNodeInner);

const NODE_TYPES: NodeTypes = { event: EventNode };

function layoutPositions(
  events: FoldedEvent[],
  edges: FoldedEdge[],
): Map<number, { x: number; y: number; height: number }> {
  const g = new dagreGraphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    ranker: 'network-simplex',
    nodesep: 60,
    ranksep: 90,
    marginx: 16,
    marginy: 16,
  } as DagreGraphLabel);
  g.setDefaultEdgeLabel(() => ({}));
  for (const ev of events) {
    g.setNode(String(ev.id), {
      width: NODE_WIDTH,
      height: estimateHeight(ev.summary),
    });
  }
  for (const ed of edges) {
    if (events.some((e) => e.id === ed.src) && events.some((e) => e.id === ed.dst)) {
      g.setEdge(String(ed.src), String(ed.dst));
    }
  }
  dagreLayout(g);
  const out = new Map<number, { x: number; y: number; height: number }>();
  for (const ev of events) {
    const n = g.node(String(ev.id));
    if (n) {
      const h = estimateHeight(ev.summary);
      out.set(ev.id, { x: n.x - NODE_WIDTH / 2, y: n.y - h / 2, height: h });
    }
  }
  return out;
}

function topologyKey(events: FoldedEvent[], edges: FoldedEdge[]): string {
  const ev = events
    .map((e) => `${e.id.toString()}:${e.summary.length.toString()}`)
    .sort()
    .join('|');
  const ed = edges
    .map((e) => `${e.src.toString()}->${e.dst.toString()}:${e.kind}`)
    .sort()
    .join('|');
  return `${ev}#${ed}`;
}

export function LiveGraphView({
  events,
  edges,
  highlightId,
}: LiveGraphViewProps): ReactElement {
  const topology = useMemo(() => topologyKey(events, edges), [events, edges]);
  const positionsRef = useRef<Map<number, { x: number; y: number; height: number }>>(
    new Map(),
  );
  const lastTopologyRef = useRef<string | null>(null);

  if (lastTopologyRef.current !== topology) {
    positionsRef.current = layoutPositions(events, edges);
    lastTopologyRef.current = topology;
  }

  const rfNodes: Array<RFNode<EventNodeData>> = useMemo(() => {
    const positions = positionsRef.current;
    return events.map((ev) => {
      const pos = positions.get(ev.id) ?? { x: 0, y: 0, height: NODE_MIN_HEIGHT };
      return {
        id: String(ev.id),
        type: 'event',
        position: { x: pos.x, y: pos.y },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          id: ev.id,
          kind: ev.kind,
          summary: ev.summary,
          source_turns: ev.source_turns,
          highlighted: highlightId === ev.id,
        },
      };
    });
  }, [events, highlightId, topology]); // eslint-disable-line react-hooks/exhaustive-deps

  const rfEdges: RFEdge[] = useMemo(
    () =>
      edges
        .filter(
          (e) =>
            events.some((ev) => ev.id === e.src) &&
            events.some((ev) => ev.id === e.dst),
        )
        .map((e, i) => ({
          id: `e-${i.toString()}`,
          source: String(e.src),
          target: String(e.dst),
          label: e.reason || e.kind,
          style:
            e.kind === 'ref'
              ? { stroke: '#2563eb', strokeDasharray: '4 3' }
              : { stroke: '#666' },
        })),
    [edges, events],
  );

  // Forcing a fresh ReactFlow instance on every topology change keeps
  // fitView honest as the graph grows during a live run.
  useEffect(() => {
    // No-op effect; only here to silence the eslint exhaustive-deps lint
    // about ``topology`` being referenced inside the memo above.
  }, [topology]);

  if (events.length === 0) {
    return (
      <div className='lh-graph__empty'>
        {`Waiting for graph operations… the extractor hasn't fired yet.`}
      </div>
    );
  }

  return (
    <div className='lh-graph'>
      <ReactFlow
        nodes={rfNodes}
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
