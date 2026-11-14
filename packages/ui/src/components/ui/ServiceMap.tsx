// Service-map composition adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/ServiceMap/ServiceMap.tsx
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
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
  type NodeChange,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type XYPosition,
  getViewportForBounds,
  useInternalNode,
  useReactFlow,
  useStore,
  useStoreApi,
} from '@xyflow/react';

import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStrings } from '../../locale';
import './ServiceMap.css';
import { StatusDot } from './StatusDot';
import {
  type SelectedRowDetail,
  SelectedRowDetailContext,
} from './selectedRowDetail';
import { type WorkStatus, workStatusDot } from './workStatus';

/**
 * Drawn as a dot before the node's label. `active` is work in progress, e.g.
 * a running task: the ink dot pulses.
 */
export type ServiceMapStatus = WorkStatus;
export type ServiceMapDirection = 'LR' | 'TB';

export interface ServiceMapNode {
  id: string;
  label: string;
  sublabel?: string;
  status?: ServiceMapStatus;
  badge?: number | string;
  data?: Record<string, unknown>;
}

/**
 * A labelled box around some nodes, e.g. the tasks of one phase. Its id may
 * also be a node's id.
 */
export interface ServiceMapGroup {
  id: string;
  label: string;
  nodeIds: string[];
}

/** For assistive technology, named by its nodes' labels, e.g. "checkout to payments". */
export interface ServiceMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** `active` is a node's state only. */
  status?: Exclude<ServiceMapStatus, 'active'>;
}

export interface ServiceMapProps {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  /**
   * Boxes drawn around groups of nodes, e.g. the phases of a pipeline. The
   * groups follow one another along `direction` in the order given, each
   * laid out on its own; nodes in no group come after the last group. A
   * node belongs to the first group that lists it.
   */
  groups?: ServiceMapGroup[];
  direction?: ServiceMapDirection;
  /** Height in px. Default: the container's height, at least `--service-map-min-height`. */
  height?: number;
  /**
   * Fill the viewport's height below the shell header
   * (`--service-map-viewport-height`), for a page whose main view is the
   * map. At 768 px and below the map keeps its default height, so a touch
   * can still scroll the page past it. `height` overrides it.
   */
  fillViewport?: boolean;
  /**
   * Called when a node is clicked, or gets Enter or Space while focused.
   * Without it nodes can be neither focused nor selected.
   */
  onNodeClick?: (node: ServiceMapNode) => void;
  /** The same for edges. */
  onEdgeClick?: (edge: ServiceMapEdge) => void;
  /** Drawn inverted, and `aria-current` for assistive technology. */
  selectedNodeId?: string;
  /**
   * Opens at actual size on this node instead of fitting the whole map, and
   * again whenever it changes: fitted to the node and the nodes it has a
   * direct edge to or from when they fit at actual size, otherwise centred
   * on the node alone. Large maps stay readable when they open. An id that
   * is not on the map is ignored.
   *
   * Without it the map opens fitted whole. At 768 px and below a map that
   * fits only below a readable size opens at the smallest readable zoom on
   * its start instead, the left edge for `LR` and the top for `TB`, to be
   * panned from there.
   */
  focusNodeId?: string;
  /**
   * Show the minimap in the bottom-right corner. A fit keeps its strip on
   * the right clear, so a map fitted whole opens with no node under it.
   * Default: shown unless `focusNodeId` is given, since a focused view runs
   * past every edge of the map and the minimap would cover nodes there. It
   * is not shown at 768 px and below.
   */
  minimap?: boolean;
  /**
   * The map's accessible name. Each node is a `group` named by its label
   * and, in a group, described by the group's label; a group's box is not
   * a `group`.
   */
  ariaLabel?: string;
  className?: string;
}

interface ServiceNodeData extends Record<string, unknown> {
  node: ServiceMapNode;
  selected: boolean;
}

interface ServiceGroupData extends Record<string, unknown> {
  label: string;
  /** The label's element id, which the group's nodes are described by. */
  labelId: string;
}

type ServiceFlowNode =
  | Node<ServiceNodeData, 'service'>
  | Node<ServiceGroupData, 'serviceGroup'>;

interface ServiceEdgeData extends Record<string, unknown> {
  edge: ServiceMapEdge;
}

/** A node is at least this size; it widens with its label up to NODE_MAX_WIDTH, then wraps it. */
const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;
const NODE_MAX_WIDTH = 320;
/** Room above a group's nodes for its label. */
const GROUP_LABEL_HEIGHT = 28;
/** Space between consecutive groups along the direction. */
const GROUP_GAP = 64;

// The layout reads these sizes, so the CSS node and group boxes read them too.
const SIZE_VARS = {
  '--aegis-service-map-node-w': `${String(NODE_WIDTH)}px`,
  '--aegis-service-map-node-h': `${String(NODE_HEIGHT)}px`,
  '--aegis-service-map-node-max-w': `${String(NODE_MAX_WIDTH)}px`,
  '--aegis-service-map-group-label-h': `${String(GROUP_LABEL_HEIGHT)}px`,
};

interface Size {
  width: number;
  height: number;
}

const DEFAULT_SIZE: Size = { width: NODE_WIDTH, height: NODE_HEIGHT };

/** A stretch of the map laid out on its own: a group's nodes, or the nodes in no group. */
interface Part {
  group?: ServiceMapGroup;
  ids: string[];
}

/** What the layout and the fit read: the map without its nodes' and edges' content. */
interface MapShape {
  direction: ServiceMapDirection;
  ids: string[];
  /** The endpoints of each edge between two nodes on the map. */
  links: Array<[string, string]>;
  groups: ServiceMapGroup[];
}

function shapeOf(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  groups: ServiceMapGroup[],
  direction: ServiceMapDirection,
): MapShape {
  const ids = nodes.map((n) => n.id);
  const present = new Set(ids);
  return {
    direction,
    ids,
    links: edges
      .filter((e) => present.has(e.source) && present.has(e.target))
      .map((e) => [e.source, e.target]),
    groups,
  };
}

/** Each group with the nodes it claims, in the order given, then the nodes in no group. */
function partsOf(ids: string[], groups: ServiceMapGroup[]): Part[] {
  const present = new Set(ids);
  const claimed = new Set<string>();
  const grouped = groups.map((group) => {
    const ids = [...new Set(group.nodeIds)].filter(
      (id) => present.has(id) && !claimed.has(id),
    );
    ids.forEach((id) => claimed.add(id));
    return { group, ids };
  });
  const rest = ids.filter((id) => !claimed.has(id));
  return [...grouped, { ids: rest }].filter((part) => part.ids.length > 0);
}

/** Lays out one part with dagre: its nodes and the edges between them. Positions are top-left corners. */
function layoutPart(
  ids: string[],
  links: MapShape['links'],
  direction: ServiceMapDirection,
  sizeOf: (id: string) => Size,
): { positions: Map<string, XYPosition>; width: number; height: number } {
  const g = new graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 16,
    marginy: 16,
  });
  for (const id of ids) {
    g.setNode(id, { ...sizeOf(id) });
  }
  for (const [source, target] of links) {
    if (g.hasNode(source) && g.hasNode(target)) {
      g.setEdge(source, target);
    }
  }
  dagreLayout(g);
  const positions = new Map(
    ids.map((id) => {
      const { x = 0, y = 0 } = g.node(id) as { x?: number; y?: number };
      const size = sizeOf(id);
      return [id, { x: x - size.width / 2, y: y - size.height / 2 }];
    }),
  );
  const { width = 0, height = 0 } = g.graph();
  return { positions, width, height };
}

interface MapLayout {
  /** The group boxes. */
  groups: ServiceFlowNode[];
  /** Each node's top-left corner. */
  positions: Map<string, XYPosition>;
  /** The label id of the group each grouped node is in. */
  groupLabels: Map<string, string>;
}

/**
 * Lays the parts out one after another along the direction, each centred
 * across it, with dagre inside each part.
 */
function computeLayout(
  shape: MapShape,
  sizes: ReadonlyMap<string, Size>,
  idPrefix: string,
): MapLayout {
  const labelIdOf = (group: ServiceMapGroup): string =>
    `${idPrefix}-group-${String(shape.groups.indexOf(group))}`;
  const horizontal = shape.direction === 'LR';
  const parts = partsOf(shape.ids, shape.groups).map((part) => {
    const laid = layoutPart(part.ids, shape.links, shape.direction, (id) => {
      return sizes.get(id) ?? DEFAULT_SIZE;
    });
    const labelHeight = part.group === undefined ? 0 : GROUP_LABEL_HEIGHT;
    return {
      ...part,
      ...laid,
      labelHeight,
      boxHeight: laid.height + labelHeight,
    };
  });
  const across = Math.max(
    0,
    ...parts.map((part) => (horizontal ? part.boxHeight : part.width)),
  );
  let along = 0;
  const placed = parts.map((part) => {
    const origin = horizontal
      ? { x: along, y: (across - part.boxHeight) / 2 }
      : { x: (across - part.width) / 2, y: along };
    along += (horizontal ? part.width : part.boxHeight) + GROUP_GAP;
    return { ...part, origin };
  });
  return {
    groups: placed.flatMap((part): ServiceFlowNode[] =>
      part.group === undefined
        ? []
        : [
            {
              // Prefixed, so a group may share an id with a node.
              id: `group:${part.group.id}`,
              type: 'serviceGroup',
              position: part.origin,
              width: part.width,
              height: part.boxHeight,
              data: {
                label: part.group.label,
                labelId: labelIdOf(part.group),
              },
              // Not a group for assistive technology: the box contains no
              // nodes in the DOM, so its label is plain text, which its
              // nodes are described by. It cannot be focused, so it has no
              // keyboard help either.
              domAttributes: {
                'aria-roledescription': undefined,
                'aria-describedby': undefined,
              },
              // Under the edges, and letting clicks through to them: React
              // Flow gives every node's wrapper pointer events once the map
              // has onNodeClick.
              zIndex: -1,
              style: { pointerEvents: 'none' },
              draggable: false,
              connectable: false,
              selectable: false,
              focusable: false,
            },
          ],
    ),
    positions: new Map(
      placed.flatMap((part) =>
        [...part.positions].map(([id, p]) => [
          id,
          {
            x: part.origin.x + p.x,
            y: part.origin.y + part.labelHeight + p.y,
          },
        ]),
      ),
    ),
    groupLabels: new Map(
      placed.flatMap((part) => {
        const { group } = part;
        return group === undefined
          ? []
          : part.ids.map((id) => [id, labelIdOf(group)] as const);
      }),
    ),
  };
}

function ServiceGroup({
  data,
}: NodeProps<Node<ServiceGroupData, 'serviceGroup'>>): JSX.Element {
  return (
    <div className="aegis-service-map__group">
      <span id={data.labelId} className="aegis-service-map__group-label">
        {data.label}
      </span>
    </div>
  );
}

function ServiceNode({
  data,
}: NodeProps<Node<ServiceNodeData, 'service'>>): JSX.Element {
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
      <div className="aegis-service-map__node-body">
        <div className="aegis-service-map__node-label">
          <StatusDot {...workStatusDot(status, selected)} />
          <span className="aegis-service-map__node-label-text">
            {node.label}
          </span>
        </div>
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
  const { sourceX, sourceY, targetX, targetY, label, markerEnd, style } = props;
  // The label follows the path by its id, which must be unique on the page,
  // also when two maps share edge ids.
  const pathId = useId();
  const midX = (sourceX + targetX) / 2;
  const path = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  return (
    <>
      {/* The focus ring, drawn along the path under it. */}
      <path d={path} className="aegis-service-map__edge-focus" fill="none" />
      <path
        id={pathId}
        d={path}
        className="aegis-service-map__edge-path"
        markerEnd={markerEnd}
        style={style}
        fill="none"
      />
      {label !== undefined && label !== '' && (
        <text className="aegis-service-map__edge-label">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      )}
    </>
  );
}

const NODE_TYPES = { service: ServiceNode, serviceGroup: ServiceGroup };
const EDGE_TYPES = { service: ServiceEdge };

const NARROW_QUERY = '(max-width: 768px)';
/** Space kept clear around fitted nodes, in px. */
const FIT_MARGIN = 24;
/** Low enough that fitting the whole map fits it, so the minimap's strip stays clear. */
const MIN_ZOOM = 0.1;
/** A focused map opens at this zoom, so its labels are readable. */
const FOCUS_ZOOM = 1;
/** The smallest zoom a narrow map opens at: a node's 13 px label reads at 11 px. */
const READABLE_ZOOM = 11 / 13;
// React Flow draws the controls and the minimap in panels inset by 15 px. A
// control button is 26 px, 28 inside the controls' hairline border.
const PANEL_INSET = 15;
const CONTROLS_WIDTH = 28;
const MINIMAP_WIDTH = 200;

/** A fit padding in px; React Flow reads a bare number as a fraction of the view. */
const px = (value: number): `${number}px` => `${value}px`;

/** A node with the nodes it has a direct edge to or from. */
function neighbourhood(id: string, links: MapShape['links']): string[] {
  return [
    ...new Set([
      id,
      ...links.filter(([source]) => source === id).map(([, target]) => target),
      ...links.filter(([, target]) => target === id).map(([source]) => source),
    ]),
  ];
}

/** The minimap draws groups as outlines, so the nodes inside them stay visible. */
function minimapNodeClass(node: Node): string {
  return node.type === 'serviceGroup' ? 'aegis-service-map__minimap-group' : '';
}

/**
 * Fits the view once the layout uses every node's measured size, and again
 * when the layout or the focus changes. Nothing else moves the view, so a
 * new status or selection keeps the user's pan and zoom. Returns whether
 * the view has been fitted to the current focus.
 */
function useFit(
  shape: MapShape,
  layout: MapLayout,
  laidOut: boolean,
  focusNodeId: string | undefined,
  showMinimap: boolean,
  narrow: boolean,
): boolean {
  const { fitView, getNodes, getNodesBounds, setViewport } = useReactFlow();
  const store = useStoreApi();
  const paneSized = useStore((state) => state.width > 0 && state.height > 0);
  const focus = useMemo(
    () =>
      focusNodeId !== undefined && shape.ids.includes(focusNodeId)
        ? { id: focusNodeId, near: neighbourhood(focusNodeId, shape.links) }
        : undefined,
    [focusNodeId, shape],
  );
  const [fittedTo, setFittedTo] = useState<string | null>();
  useEffect(() => {
    if (paneSized && laidOut) {
      const settle = (): void => {
        setFittedTo(focus?.id ?? null);
      };
      const padding = {
        top: px(FIT_MARGIN),
        bottom: px(FIT_MARGIN),
        left: px(PANEL_INSET + CONTROLS_WIDTH + FIT_MARGIN),
        right: px(
          showMinimap ? PANEL_INSET + MINIMAP_WIDTH + FIT_MARGIN : FIT_MARGIN,
        ),
      };
      const { width, height } = store.getState();
      if (focus === undefined) {
        const all = getNodes();
        const bounds = getNodesBounds(all);
        const fitted = getViewportForBounds(
          bounds,
          width,
          height,
          MIN_ZOOM,
          1,
          padding,
        );
        if (narrow && fitted.zoom < READABLE_ZOOM) {
          // A phone has no minimap and too little room for the whole map,
          // so it opens where the map starts, on its first node.
          const zoom = READABLE_ZOOM;
          const horizontal = shape.direction === 'LR';
          const along = (n: Node): number =>
            horizontal ? n.position.x : n.position.y;
          const first = all
            .filter((n) => n.type === 'service')
            .reduce((a, b) => (along(b) < along(a) ? b : a));
          const { width: w = NODE_WIDTH, height: h = NODE_HEIGHT } =
            first.measured ?? {};
          void setViewport(
            horizontal
              ? {
                  x:
                    PANEL_INSET + CONTROLS_WIDTH + FIT_MARGIN - bounds.x * zoom,
                  y: height / 2 - (first.position.y + h / 2) * zoom,
                  zoom,
                }
              : {
                  x: width / 2 - (first.position.x + w / 2) * zoom,
                  y: FIT_MARGIN - bounds.y * zoom,
                  zoom,
                },
          ).then(settle);
        } else {
          void fitView({ maxZoom: 1, padding }).then(settle);
        }
      } else {
        const nearFits =
          getViewportForBounds(
            getNodesBounds(focus.near),
            width,
            height,
            MIN_ZOOM,
            FOCUS_ZOOM,
            padding,
          ).zoom >= FOCUS_ZOOM;
        void fitView({
          nodes: (nearFits ? focus.near : [focus.id]).map((id) => ({ id })),
          minZoom: FOCUS_ZOOM,
          maxZoom: FOCUS_ZOOM,
          padding,
        }).then(settle);
      }
    }
  }, [
    paneSized,
    laidOut,
    layout,
    focus,
    showMinimap,
    narrow,
    shape.direction,
    store,
    fitView,
    getNodes,
    getNodesBounds,
    setViewport,
  ]);
  return fittedTo === (focus?.id ?? null);
}

/**
 * The selected node of a map in a `DetailBeside`: once the view is fitted
 * it places the node's box, again whenever the map pans or zooms, and at
 * 768 px and below draws the detail right under the node, over the map,
 * which grows to hold it.
 */
function ServiceMapSelection({
  nodeId,
  fitted,
  selection,
}: {
  nodeId: string;
  fitted: boolean;
  selection: SelectedRowDetail;
}): JSX.Element | null {
  const transform = useStore((state) => state.transform);
  const domNode = useStore((state) => state.domNode);
  const node = useInternalNode(nodeId);
  // The node goes only with this component, so a pan places the same node
  // again rather than a new one.
  useIsomorphicLayoutEffect(
    () => () => {
      selection.placeRow(null);
    },
    [selection],
  );
  useIsomorphicLayoutEffect(() => {
    const group = domNode?.querySelector(
      `.react-flow__node[data-id="${CSS.escape(nodeId)}"]`,
    );
    if (fitted && group instanceof HTMLElement) {
      selection.placeRow(group);
    }
  }, [selection, domNode, nodeId, transform, fitted]);
  const height = node?.measured.height;
  if (selection.inline === null || node === undefined || height === undefined) {
    return null;
  }
  const [, y, zoom] = transform;
  const bottom = (node.internals.positionAbsolute.y + height) * zoom + y;
  return (
    <div
      className="aegis-service-map__detail"
      style={{ marginTop: Math.max(bottom, 0) }}
    >
      {selection.inline}
    </div>
  );
}

/**
 * Pans a node or edge that gets keyboard focus fully into view, centred.
 * React Flow pans only to a node entirely outside the view, and never to
 * an edge.
 */
function usePanToFocused(): (event: FocusEvent<HTMLDivElement>) => void {
  const { getViewport, setViewport } = useReactFlow();
  return useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.matches(
          '.react-flow__node:focus-visible, .react-flow__edge:focus-visible',
        )
      ) {
        return;
      }
      // The browser has already scrolled the pane to the element, and React
      // Flow scrolls it back, so the offset is added back to place it.
      const { scrollLeft, scrollTop } = event.currentTarget;
      const pane = event.currentTarget.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const left = box.left - pane.left + scrollLeft;
      const top = box.top - pane.top + scrollTop;
      if (
        left >= 0 &&
        top >= 0 &&
        left + box.width <= pane.width &&
        top + box.height <= pane.height
      ) {
        return;
      }
      const { x, y, zoom } = getViewport();
      void setViewport({
        x: x + pane.width / 2 - (left + box.width / 2),
        y: y + pane.height / 2 - (top + box.height / 2),
        zoom,
      });
    },
    [getViewport, setViewport],
  );
}

function ServiceMapInner({
  nodes,
  edges,
  groups = [],
  direction = 'LR',
  height,
  fillViewport = false,
  onNodeClick,
  onEdgeClick,
  selectedNodeId,
  focusNodeId,
  minimap = focusNodeId === undefined,
  ariaLabel,
  className,
}: ServiceMapProps): JSX.Element {
  const strings = useStrings();
  const idPrefix = useId();
  // React Flow names its elements after this id ('1' when none is given),
  // so each map passes its own and a page can hold several.
  const flowId = `aegis-service-map${idPrefix.replace(/:/g, '-')}`;
  const nodesSelectable = onNodeClick !== undefined;
  const edgesSelectable = onEdgeClick !== undefined;
  // Node sizes as React Flow measured them; the layout reads them, so a
  // node can be as wide as its label.
  const [measured, setMeasured] = useState<ReadonlyMap<string, Size>>(
    () => new Map(),
  );
  const shapeJson = useMemo(
    () => JSON.stringify(shapeOf(nodes, edges, groups, direction)),
    [nodes, edges, groups, direction],
  );
  // Parsed back from its JSON, so the shape is a new object only when it
  // changes, not when the parent passes equal arrays again.
  const shape = useMemo(() => JSON.parse(shapeJson) as MapShape, [shapeJson]);
  const layout = useMemo(
    () => computeLayout(shape, measured, idPrefix),
    [shape, measured, idPrefix],
  );
  const isHorizontal = direction === 'LR';
  const flowNodes = useMemo(
    (): ServiceFlowNode[] => [
      ...layout.groups,
      ...nodes.map((n): ServiceFlowNode => {
        // A node in a group is described by the group's label. React Flow
        // describes a node by its keyboard help, the element it names
        // `react-flow__node-desc-<rfId>`; a node that cannot be selected
        // has none.
        const describedBy = [
          layout.groupLabels.get(n.id),
          nodesSelectable ? `react-flow__node-desc-${flowId}` : undefined,
        ]
          .filter(Boolean)
          .join(' ');
        return {
          id: n.id,
          type: 'service',
          position: layout.positions.get(n.id) ?? { x: 0, y: 0 },
          // Handed back as applyNodeChanges would, so React Flow keeps the
          // size it measured instead of measuring the node again.
          measured: measured.get(n.id),
          ariaLabel: n.label,
          // React Flow gives only a focusable node a role, and the role
          // description below needs one.
          ariaRole: 'group',
          domAttributes: {
            'aria-roledescription': strings.serviceMapNodeRole,
            // A group takes no aria-selected.
            'aria-current': selectedNodeId === n.id ? true : undefined,
            'aria-describedby': describedBy === '' ? undefined : describedBy,
          },
          data: { node: n, selected: selectedNodeId === n.id },
          sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
          targetPosition: isHorizontal ? Position.Left : Position.Top,
          draggable: false,
          connectable: false,
          selectable: nodesSelectable,
          focusable: nodesSelectable,
        };
      }),
    ],
    [
      layout,
      nodes,
      measured,
      selectedNodeId,
      isHorizontal,
      nodesSelectable,
      flowId,
      strings,
    ],
  );
  const flowEdges = useMemo((): Array<Edge<ServiceEdgeData>> => {
    const labelOf = new Map(nodes.map((n) => [n.id, n.label]));
    return edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ariaLabel: strings.serviceMapEdgeName(
        labelOf.get(e.source) ?? e.source,
        labelOf.get(e.target) ?? e.target,
      ),
      // React Flow makes an unfocusable edge an img; aria-roledescription needs a group.
      ariaRole: 'group',
      domAttributes: { 'aria-roledescription': strings.serviceMapEdgeRole },
      type: 'service',
      data: { edge: e },
      label: e.label,
      selectable: edgesSelectable,
      focusable: edgesSelectable,
      className: `aegis-service-map__edge aegis-service-map__edge--${e.status ?? 'ok'}`,
    }));
  }, [nodes, edges, edgesSelectable, strings]);

  const { getNode } = useReactFlow();
  const handleNodesChange = useCallback(
    (changes: Array<NodeChange<ServiceFlowNode>>) => {
      const resized = changes.flatMap((change) =>
        change.type === 'dimensions' &&
        change.dimensions !== undefined &&
        getNode(change.id)?.type === 'service'
          ? [[change.id, change.dimensions] as const]
          : [],
      );
      setMeasured((previous) =>
        resized.every(
          ([id, size]) =>
            previous.get(id)?.width === size.width &&
            previous.get(id)?.height === size.height,
        )
          ? previous
          : new Map([...previous, ...resized]),
      );
    },
    [getNode],
  );

  const narrow = useMediaQuery(NARROW_QUERY);
  const showMinimap = minimap && !narrow;
  const selection = useContext(SelectedRowDetailContext);
  const fitted = useFit(
    shape,
    layout,
    nodes.every((n) => measured.has(n.id)),
    focusNodeId,
    showMinimap,
    narrow,
  );
  const shownId =
    selectedNodeId !== undefined && shape.ids.includes(selectedNodeId)
      ? selectedNodeId
      : undefined;
  // While the view moves to a new focus, the detail stays under the node it
  // was drawn under, so the map keeps its height and the page its scroll.
  const [drawnId, setDrawnId] = useState<string>();
  if (fitted && drawnId !== shownId) {
    setDrawnId(shownId);
  }
  // A DetailBeside waits while the view is fitted to a newly selected node.
  useIsomorphicLayoutEffect(() => {
    if (selection === null || shownId === undefined || fitted) {
      return undefined;
    }
    selection.awaitRow();
    return () => {
      selection.placeRow(null);
    };
  }, [selection, shownId, fitted]);
  const handleFocus = usePanToFocused();

  const handleNodeClick = useCallback(
    (_: unknown, n: ServiceFlowNode) => {
      if (n.type === 'service') {
        onNodeClick?.(n.data.node);
      }
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
    ...SIZE_VARS,
    height: height === undefined ? undefined : `${String(height)}px`,
  } as CSSProperties;

  return (
    <div
      className={[
        'aegis-service-map',
        fillViewport ? 'aegis-service-map--fill-viewport' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {/* Positioned over the whole box, so React Flow has a definite height
          even when the box only has its min-height. */}
      <div className="aegis-service-map__pane">
        <ReactFlow
          id={flowId}
          aria-label={ariaLabel}
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          minZoom={MIN_ZOOM}
          nodesDraggable={false}
          nodesConnectable={false}
          autoPanOnNodeFocus={false}
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          ariaLabelConfig={strings.serviceMapAriaLabels}
          onNodesChange={handleNodesChange}
          onNodeClick={nodesSelectable ? handleNodeClick : undefined}
          onEdgeClick={edgesSelectable ? handleEdgeClick : undefined}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} position="top-left" />
          {showMinimap && (
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              style={{ width: MINIMAP_WIDTH }}
              nodeClassName={minimapNodeClass}
            />
          )}
        </ReactFlow>
      </div>
      {selection !== null && drawnId !== undefined && (
        <ServiceMapSelection
          nodeId={drawnId}
          fitted={fitted}
          selection={selection}
        />
      )}
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
