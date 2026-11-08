// Service-map composition adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/ServiceMap/ServiceMap.tsx
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useMemo,
} from 'react';

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

import { type AegisStrings, useStrings } from '../../locale';
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
  /**
   * Called when a node is clicked, or gets Enter or Space while focused.
   * Without it nodes can be neither focused nor selected.
   */
  onNodeClick?: (node: ServiceMapNode) => void;
  /** The same for edges. */
  onEdgeClick?: (edge: ServiceMapEdge) => void;
  /** Marks a node as selected (inverted, and `aria-current`). */
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

// dagre lays nodes out at these sizes, so the CSS node box reads them too.
const NODE_SIZE_VARS = {
  '--aegis-service-map-node-w': `${String(NODE_WIDTH)}px`,
  '--aegis-service-map-node-h': `${String(NODE_HEIGHT)}px`,
};

interface LayoutResult {
  nodes: Array<Node<ServiceNodeData>>;
  edges: Array<Edge<ServiceEdgeData>>;
}

function computeLayout(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  direction: ServiceMapDirection,
  selectedNodeId: string | undefined,
  selectable: { nodes: boolean; edges: boolean },
  strings: AegisStrings,
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
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      data: { node: n, selected: selectedNodeId === n.id },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      draggable: false,
      connectable: false,
      selectable: selectable.nodes,
      focusable: selectable.nodes,
      // React Flow gives only a focusable node a role, and the role
      // description below needs one.
      ariaRole: 'group',
      domAttributes: {
        'aria-roledescription': strings.serviceMapNodeRole,
        'aria-current': selectedNodeId === n.id ? true : undefined,
        // React Flow points every node at its keyboard help; a node that
        // cannot be selected has none.
        ...(selectable.nodes ? {} : { 'aria-describedby': undefined }),
      },
    };
  });

  const labels = new Map(nodes.map((n) => [n.id, n.label]));
  const rfEdges: Array<Edge<ServiceEdgeData>> = edges.map((e) => {
    const status = e.status ?? 'ok';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'service',
      data: { edge: e },
      label: e.label,
      selectable: selectable.edges,
      focusable: selectable.edges,
      ariaLabel: strings.serviceMapEdgeName(
        labels.get(e.source) ?? e.source,
        labels.get(e.target) ?? e.target,
      ),
      domAttributes: { 'aria-roledescription': strings.serviceMapEdgeRole },
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
  const strings = useStrings();
  const nodesSelectable = onNodeClick !== undefined;
  const edgesSelectable = onEdgeClick !== undefined;
  const layoutKey = useMemo(
    () => JSON.stringify({ direction, nodes, edges, selectedNodeId }),
    [direction, nodes, edges, selectedNodeId],
  );
  const layout = useMemo(
    () =>
      computeLayout(
        nodes,
        edges,
        direction,
        selectedNodeId,
        { nodes: nodesSelectable, edges: edgesSelectable },
        strings,
      ),
    // Layout is keyed by the JSON-stringified inputs so structural-equality
    // changes recompute; including the raw arrays would re-run on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey, nodesSelectable, edgesSelectable, strings],
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
  // React Flow's own Enter and Space only change its internal selection,
  // which never reaches the host, so a focused node or edge answers the
  // keys here, as a click would.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const id = target.getAttribute('data-id');
      if (target.classList.contains('react-flow__node')) {
        const node = nodes.find((n) => n.id === id);
        if (node && onNodeClick) {
          event.preventDefault();
          onNodeClick(node);
        }
      } else if (target.classList.contains('react-flow__edge')) {
        const edge = edges.find((e) => e.id === id);
        if (edge && onEdgeClick) {
          event.preventDefault();
          onEdgeClick(edge);
        }
      }
    },
    [nodes, edges, onNodeClick, onEdgeClick],
  );

  const style = {
    ...NODE_SIZE_VARS,
    height: height === undefined ? undefined : `${String(height)}px`,
  } as CSSProperties;

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
        panOnDrag
        zoomOnScroll
        fitView
        proOptions={{ hideAttribution: true }}
        ariaLabelConfig={strings.serviceMapAriaLabels}
        onNodeClick={nodesSelectable ? handleNodeClick : undefined}
        onEdgeClick={edgesSelectable ? handleEdgeClick : undefined}
        onKeyDown={handleKeyDown}
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
