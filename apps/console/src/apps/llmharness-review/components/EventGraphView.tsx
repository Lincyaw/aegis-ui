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
import { type ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  graphlib as dagreGraphlib,
  layout as dagreLayout,
  type GraphLabel as DagreGraphLabel,
} from '@dagrejs/dagre';
import ReactFlow, {
  BaseEdge,
  Background,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Panel as RFPanel,
  Position,
  useEdgesState,
  useNodesState,
  type Edge as RFEdge,
  type EdgeProps,
  type EdgeTypes,
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
  /**
   * Fired when the user clicks the "↗ turn N" affordance inside a node.
   * Receives the full source_turns array so the host can render every
   * cited turn in a scrollable popup instead of forcing a navigation.
   */
  onOpenTurns?: (turns: number[]) => void;
  /**
   * Fired on node double-click. Used to pop a detail modal in the host.
   * Receives the event id of the double-clicked node.
   */
  onOpenDetail?: (eventId: number) => void;
  /** Optional fixed height; defaults via CSS. */
  height?: number;
}

const NODE_TYPES: NodeTypes = { event: EventNode };

function WrappingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
}: EdgeProps): ReactElement {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className='llmh-graph__edge-label'
            style={{
              transform: `translate(-50%, -50%) translate(${labelX.toString()}px, ${labelY.toString()}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const EDGE_TYPES: EdgeTypes = { wrap: WrappingEdge };

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
  // network-simplex ranker + tight-tree ordering reads more like a tree
  // when the graph is a DAG; wider nodesep prevents siblings from
  // crowding into each other and cleaner edge routing.
  g.setGraph({
    rankdir: 'TB',
    ranker: 'network-simplex',
    align: 'UL',
    nodesep: 80,
    ranksep: 120,
    edgesep: 24,
    marginx: 24,
    marginy: 24,
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

// Stable signature of graph topology — when this changes we re-run dagre
// and reset positions; otherwise we leave user-dragged positions alone.
function topologyKey(events: ExtractorEvent[], edges: GraphEdge[]): string {
  const ev = events
    .map((e) => `${nodeKeyOf(e)}:${e.summary.length.toString()}`)
    .sort()
    .join('|');
  const ed = edges
    .map((e) => {
      const srcTurns = (e as { src_turns?: number[] }).src_turns;
      const dstTurns = (e as { dst_turns?: number[] }).dst_turns;
      return `${endpointKey(e.src, srcTurns)}>${endpointKey(e.dst, dstTurns)}:${e.kind}`;
    })
    .sort()
    .join('|');
  return `${ev}#${ed}`;
}

function edgeStrokeFor(kind: string): {
  stroke: string;
  strokeDasharray?: string;
} {
  if (kind === 'ref') {
    return { stroke: 'var(--accent-info)', strokeDasharray: '4 3' };
  }
  return { stroke: 'var(--text-muted)' };
}

interface LegendProps {
  eventKinds: string[];
  edgeKinds: string[];
  newCount: number;
  selectedCount: number;
}

function GraphLegend({
  eventKinds,
  edgeKinds,
  newCount,
  selectedCount,
}: LegendProps): ReactElement {
  return (
    <div className='llmh-graph__legend'>
      <div className='llmh-graph__legend-title'>Legend</div>
      {eventKinds.length > 0 && (
        <div className='llmh-graph__legend-row'>
          <span className='llmh-graph__legend-label'>events</span>
          <div className='llmh-graph__legend-chips'>
            {eventKinds.map((k) => (
              <span
                key={k}
                className={`llmh-graph__legend-chip llmh-evt-node--${k}`}
              >
                <span className='llmh-evt-node__kind'>{k}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {edgeKinds.length > 0 && (
        <div className='llmh-graph__legend-row'>
          <span className='llmh-graph__legend-label'>edges</span>
          <div className='llmh-graph__legend-chips'>
            {edgeKinds.map((k) => {
              const s = edgeStrokeFor(k);
              return (
                <span key={k} className='llmh-graph__legend-edge'>
                  <svg
                    width='28'
                    height='8'
                    viewBox='0 0 28 8'
                    aria-hidden='true'
                  >
                    <line
                      x1='0'
                      y1='4'
                      x2='28'
                      y2='4'
                      stroke={s.stroke}
                      strokeDasharray={s.strokeDasharray}
                      strokeWidth='1.5'
                    />
                  </svg>
                  <span>{k}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
      {(newCount > 0 || selectedCount > 0) && (
        <div className='llmh-graph__legend-row'>
          <span className='llmh-graph__legend-label'>state</span>
          <div className='llmh-graph__legend-chips'>
            {newCount > 0 && (
              <span className='llmh-graph__legend-state llmh-graph__legend-state--new'>
                new ({newCount})
              </span>
            )}
            {selectedCount > 0 && (
              <span className='llmh-graph__legend-state llmh-graph__legend-state--active'>
                selected
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildNodes(
  events: ExtractorEvent[],
  positions: Map<string, { x: number; y: number }>,
  ctx: {
    selectedEventId: number | null;
    newEventIds: Set<number> | null | undefined;
    onSelectEvent?: (id: number) => void;
    onOpenTurns?: (turns: number[]) => void;
  },
): Array<RFNode<EventNodeData>> {
  return events.map((e) => {
    const key = nodeKeyOf(e);
    return {
      id: key,
      type: 'event',
      position: positions.get(key) ?? { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        id: e.id,
        kind: String(e.kind),
        summary: e.summary,
        source_turns: e.source_turns,
        highlighted: ctx.selectedEventId === e.id,
        isNew: ctx.newEventIds?.has(e.id) ?? false,
        onSelect: ctx.onSelectEvent,
        onOpenTurns: ctx.onOpenTurns,
      },
    };
  });
}

function buildEdges(
  edges: GraphEdge[],
  selectedEventId: number | null,
): RFEdge[] {
  return edges.map((ed, i) => {
    const srcTurns = (ed as { src_turns?: number[] }).src_turns;
    const dstTurns = (ed as { dst_turns?: number[] }).dst_turns;
    const source = endpointKey(ed.src, srcTurns);
    const target = endpointKey(ed.dst, dstTurns);
    return {
      id: `e-${i.toString()}-${source}-${target}`,
      source,
      target,
      type: 'wrap',
      label: ed.reason ? ed.reason : ed.kind,
      animated:
        selectedEventId !== null &&
        (ed.src === selectedEventId || ed.dst === selectedEventId),
      style: edgeStrokeFor(ed.kind),
    };
  });
}

export function EventGraphView({
  events,
  edges,
  selectedEventId,
  newEventIds,
  onSelectEvent,
  onOpenTurns,
  onOpenDetail,
  height,
}: EventGraphViewProps) {
  const topology = useMemo(() => topologyKey(events, edges), [events, edges]);
  const lastTopologyRef = useRef<string | null>(null);

  const initialPositions = useMemo(
    () => layoutNodes(events, edges),
    // We deliberately key off topology so unrelated re-renders (selection
    // highlighting, parent re-render) don't reshuffle the dagre layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topology],
  );

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<EventNodeData>(
    buildNodes(events, initialPositions, {
      selectedEventId,
      newEventIds,
      onSelectEvent,
      onOpenTurns,
    }),
  );
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(
    buildEdges(edges, selectedEventId),
  );

  // Re-seed nodes when topology changes; otherwise just refresh the
  // per-node `data` so highlight / isNew / callback updates flow through
  // without clobbering user-dragged positions.
  useEffect(() => {
    if (lastTopologyRef.current !== topology) {
      lastTopologyRef.current = topology;
      setRfNodes(
        buildNodes(events, initialPositions, {
          selectedEventId,
          newEventIds,
          onSelectEvent,
          onOpenTurns,
        }),
      );
      return;
    }
    setRfNodes((current) =>
      current.map((n) => {
        const ev = events.find((e) => nodeKeyOf(e) === n.id);
        if (!ev) {
          return n;
        }
        return {
          ...n,
          data: {
            ...n.data,
            id: ev.id,
            kind: String(ev.kind),
            summary: ev.summary,
            source_turns: ev.source_turns,
            highlighted: selectedEventId === ev.id,
            isNew: newEventIds?.has(ev.id) ?? false,
            onSelect: onSelectEvent,
            onOpenTurns,
          },
        };
      }),
    );
  }, [
    topology,
    events,
    initialPositions,
    selectedEventId,
    newEventIds,
    onSelectEvent,
    onOpenTurns,
    setRfNodes,
  ]);

  useEffect(() => {
    setRfEdges(buildEdges(edges, selectedEventId));
  }, [edges, selectedEventId, setRfEdges]);

  const relayout = useCallback(() => {
    const positions = layoutNodes(events, edges);
    setRfNodes((current) =>
      current.map((n) => ({
        ...n,
        position: positions.get(n.id) ?? n.position,
      })),
    );
  }, [events, edges, setRfNodes]);

  const eventKinds = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      s.add(String(e.kind));
    }
    return Array.from(s).sort();
  }, [events]);
  const edgeKinds = useMemo(() => {
    const s = new Set<string>();
    for (const e of edges) {
      s.add(e.kind);
    }
    return Array.from(s).sort();
  }, [edges]);

  if (events.length === 0) {
    return (
      <EmptyState
        title='Empty graph'
        description='No events in this firing output.'
      />
    );
  }

  const style = height ? { height: `${height.toString()}px` } : undefined;
  const newCount = newEventIds?.size ?? 0;
  const selectedCount = selectedEventId !== null ? 1 : 0;

  return (
    <div className='llmh-graph' style={style}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={
          onOpenDetail
            ? (_e, node) => {
                const data = node.data as EventNodeData | undefined;
                if (data) {
                  onOpenDetail(data.id);
                }
              }
            : undefined
        }
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
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
        <RFPanel position='top-right'>
          <button
            type='button'
            className='llmh-graph__relayout'
            onClick={relayout}
            title='Re-run auto layout and reset any dragged positions'
          >
            ⟳ Re-layout
          </button>
        </RFPanel>
        <RFPanel position='bottom-left'>
          <GraphLegend
            eventKinds={eventKinds}
            edgeKinds={edgeKinds}
            newCount={newCount}
            selectedCount={selectedCount}
          />
        </RFPanel>
      </ReactFlow>
    </div>
  );
}
