// Service-map composition adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/ServiceMap/ServiceMap.tsx
import { useCallback, useMemo } from 'react';

import {
  type EdgeLabel,
  type GraphLabel,
  type NodeLabel,
  layout as dagreLayout,
  graphlib,
} from '@dagrejs/dagre';
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type EdgeProps,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';

import './ServiceMap.css';

export type ServiceMapStatus = 'ok' | 'warn' | 'error' | 'muted';
export type ServiceMapDirection = 'LR' | 'TB';

export interface ServiceMapNode {
  id: string;
  label: string;
  sublabel?: string;
  status?: ServiceMapStatus;
  badge?: number | string;
  data?: Record<string, unknown>;
}

export interface ServiceMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status?: ServiceMapStatus;
}

export interface ServiceMapProps {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  direction?: ServiceMapDirection;
  height?: number;
  onNodeClick?: (node: ServiceMapNode) => void;
  onEdgeClick?: (edge: ServiceMapEdge) => void;
  selectedNodeId?: string;
  className?: string;
}

interface ServiceNodeData extends Record<string, unknown> {
  node: ServiceMapNode;
  selected: boolean;
}

interface ServiceEdgeData extends Record<string, unknown> {
  edge: ServiceMapEdge;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;

interface LayoutResult {
  nodes: Array<Node<ServiceNodeData>>;
  edges: Array<Edge<ServiceEdgeData>>;
}

function computeLayout(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  direction: ServiceMapDirection,
  selectedNodeId: string | undefined,
): LayoutResult {
  const g = new graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 16,
    marginy: 16,
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagreLayout(g);

  const isHorizontal = direction === 'LR';
  const rfNodes: Array<Node<ServiceNodeData>> = nodes.map((n) => {
    const p = g.node(n.id) as { x?: number; y?: number } | undefined;
    return {
      id: n.id,
      type: 'service',
      position: {
        x: (p?.x ?? 0) - NODE_WIDTH / 2,
        y: (p?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: { node: n, selected: selectedNodeId === n.id },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      draggable: false,
      connectable: false,
      selectable: true,
    };
  });

  const rfEdges: Array<Edge<ServiceEdgeData>> = edges.map((e) => {
    const status = e.status ?? 'ok';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'service',
      data: { edge: e },
      label: e.label,
      className: `aegis-service-map__edge aegis-service-map__edge--${status}`,
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

function ServiceNode({ data }: NodeProps<Node<ServiceNodeData>>): JSX.Element {
  const { node, selected } = data;
  const status = node.status ?? 'ok';
  return (
    <div
      className={[
        'aegis-service-map__node',
        `aegis-service-map__node--${status}`,
        selected ? 'aegis-service-map__node--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="aegis-service-map__handle"
      />
      <span className="aegis-service-map__node-stripe" aria-hidden="true" />
      <div className="aegis-service-map__node-body">
        <div className="aegis-service-map__node-label">{node.label}</div>
        {node.sublabel !== undefined && (
          <div className="aegis-service-map__node-sublabel">
            {node.sublabel}
          </div>
        )}
      </div>
      {node.badge !== undefined && node.badge !== '' && (
        <span
          className={`aegis-service-map__node-badge aegis-service-map__node-badge--${status}`}
        >
          {node.badge}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="aegis-service-map__handle"
      />
    </div>
  );
}

function ServiceEdge(props: EdgeProps<Edge<ServiceEdgeData>>): JSX.Element {
  const { sourceX, sourceY, targetX, targetY, id, label, markerEnd, style } =
    props;
  const midX = (sourceX + targetX) / 2;
  const path = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  return (
    <>
      <path
        id={id}
        d={path}
        className="aegis-service-map__edge-path"
        markerEnd={markerEnd}
        style={style}
        fill="none"
      />
      {label !== undefined && label !== '' && (
        <text className="aegis-service-map__edge-label">
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      )}
    </>
  );
}

const NODE_TYPES = { service: ServiceNode };
const EDGE_TYPES = { service: ServiceEdge };

function ServiceMapInner({
  nodes,
  edges,
  direction = 'LR',
  height,
  onNodeClick,
  onEdgeClick,
  selectedNodeId,
  className,
}: ServiceMapProps): JSX.Element {
  const layoutKey = useMemo(
    () => JSON.stringify({ direction, nodes, edges, selectedNodeId }),
    [direction, nodes, edges, selectedNodeId],
  );
  const layout = useMemo(
    () => computeLayout(nodes, edges, direction, selectedNodeId),
    // Layout is keyed by the JSON-stringified inputs so structural-equality
    // changes recompute; including the raw arrays would re-run on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  );

  const handleNodeClick = useCallback(
    (_: unknown, n: Node<ServiceNodeData>) => {
      onNodeClick?.(n.data.node);
    },
    [onNodeClick],
  );
  const handleEdgeClick = useCallback(
    (_: unknown, e: Edge<ServiceEdgeData>) => {
      if (e.data) {
        onEdgeClick?.(e.data.edge);
      }
    },
    [onEdgeClick],
  );

  const style =
    height !== undefined ? { height: `${String(height)}px` } : undefined;

  return (
    <div
      className={['aegis-service-map', className].filter(Boolean).join(' ')}
      style={style}
    >
      <ReactFlow
        nodes={layout.nodes}
        edges={layout.edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} position="top-left" />
        <MiniMap pannable zoomable position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function ServiceMap(props: ServiceMapProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <ServiceMapInner {...props} />
    </ReactFlowProvider>
  );
}
