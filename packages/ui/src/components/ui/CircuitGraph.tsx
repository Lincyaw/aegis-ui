import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AimOutlined,
  BlockOutlined,
  CloseOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DownOutlined,
  EllipsisOutlined,
  GatewayOutlined,
  GlobalOutlined,
  InboxOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
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
  ControlButton,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Viewport,
  getViewportForBounds,
  useReactFlow,
  useStore,
} from '@xyflow/react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import './CircuitGraph.css';

/**
 * How a chip, pin or wire is coloured. `alarm` is anomaly red, for a real
 * failure such as a rise in errors; `caution` is the warning ink, e.g. a
 * slowdown; `neutral` is plain ink; `faint` recedes, e.g. a wire with
 * nothing to report.
 */
export type CircuitTone = 'alarm' | 'caution' | 'neutral' | 'faint';

/** `dashed` and `dotted` tell wires apart that exist in only one window or state. */
export type CircuitWirePattern = 'solid' | 'dashed' | 'dotted';

/** A tag in a chip's header, drawn as a small Chip in this tone. */
export interface CircuitChipTag {
  label: string;
  tone?: 'default' | 'ink' | 'caution' | 'info' | 'warning';
}

/**
 * An endpoint of a chip. `in` pins sit on the left edge, where wires
 * arrive (the endpoints a service serves); `out` pins on the right edge,
 * where wires leave (the calls it makes).
 */
export interface CircuitPin {
  id: string;
  label: string;
  side: 'in' | 'out';
  tone?: CircuitTone;
  /** A short reading after the label, e.g. "×3.1". */
  value?: string;
  /** The pin's tooltip; defaults to its label. */
  title?: string;
}

export interface CircuitChip {
  id: string;
  label: string;
  /**
   * Picks the header glyph: `service`, `database`, `cache`, `gateway`,
   * `loadgen`, `queue`, `external` or `more`; any other kind draws the
   * service glyph.
   */
  kind?: string;
  tags?: CircuitChipTag[];
  /** One line under the label, e.g. the chip's own figures. */
  meta?: string;
  /** A dot before the label; none when omitted. */
  tone?: CircuitTone;
  /**
   * Listed when the chip is expanded, in the order given, except that
   * pins a visible wire runs to come first. Past eight on a side the rest
   * collapse into one row, which their wires run to.
   */
  pins?: CircuitPin[];
  /**
   * `stub` is a placeholder that stands for chips not drawn, e.g.
   * "18 more callees": a dashed outline, no pins, selected like a chip.
   * `ghost` is a component nothing was observed from, e.g. a service with
   * no telemetry: a dashed outline with the board showing through.
   */
  variant?: 'chip' | 'stub' | 'ghost';
  /** A stronger outline, for the chips the view is about. */
  emphasis?: boolean;
  /** Recedes until selected, e.g. a component with no wires. */
  faint?: boolean;
}

/** The part of a wire between one pair of pins, drawn when an end chip is expanded. */
export interface CircuitStrand {
  sourcePin?: string;
  targetPin?: string;
  tone?: CircuitTone;
  pattern?: CircuitWirePattern;
  /** 0 to 1, as the wire's weight. */
  weight?: number;
}

/**
 * A wire from `source` to `target`. It leaves the right edge of `source`
 * and arrives at the left edge of `target`, so the board reads in the
 * direction wires run, e.g. from caller to callee.
 */
export interface CircuitWire {
  id: string;
  source: string;
  target: string;
  tone?: CircuitTone;
  pattern?: CircuitWirePattern;
  /** Stroke width from `--circuit-wire-min` (0) to `--circuit-wire-max` (1). */
  weight?: number;
  /** Drawn over a halo, e.g. the link under review. */
  highlighted?: boolean;
  /** A hollow dashed trace, for a relation with nothing observed on it. */
  ghost?: boolean;
  /**
   * Cross ticks along the trace, for calls counted from one end's own
   * records rather than observed between the two, e.g. a callee that
   * emits no traces. Combines with `tone` and `pattern`.
   */
  inferred?: boolean;
  /** Written in a pill at the middle of the wire. */
  label?: string;
  /** The wire's tooltip. */
  title?: string;
  /**
   * The pin pairs the wire joins. While either end chip is expanded the
   * wire is drawn as these strands, each from its source pin to its target
   * pin, or to the chip's edge on a collapsed end. Strands that meet the
   * same pair of pins are drawn once, in the strongest tone and weight.
   */
  strands?: CircuitStrand[];
}

export interface CircuitGraphFocus {
  /** The chips the view opens on; fitted at actual size or as near as stays legible. */
  ids: string[];
  /**
   * The chips that stay in view when `ids` do not fit legibly, e.g. the
   * two ends of the link under review. Defaults to the first of `ids`.
   */
  core?: string[];
  /** Fits again when it changes, even if the ids are the same. */
  key?: string | number;
}

export interface CircuitGraphProps {
  chips: CircuitChip[];
  wires: CircuitWire[];
  /** Chips drawn with their pins. */
  expandedIds?: string[];
  /** The chip's expand control was pressed, or the chip double-clicked. */
  onToggleExpand?: (chip: CircuitChip) => void;
  /** Drawn inverted, and `aria-current` for assistive technology. */
  selectedChipId?: string;
  /** Drawn over an ink halo with its label. */
  selectedWireId?: string;
  /** A chip was clicked, or got Enter or Space while focused. */
  onSelectChip?: (chip: CircuitChip) => void;
  /** A wire or one of its strands was clicked, or got Enter or Space. */
  onSelectWire?: (wire: CircuitWire, strand?: CircuitStrand) => void;
  /**
   * Where the view opens. When the layout changes after that, e.g. a chip
   * expands or new chips arrive, the selected chip (else the first core
   * chip) keeps its place on screen.
   */
  focus?: CircuitGraphFocus;
  /** Laid over the board's bottom-left corner, e.g. a CircuitLegend. */
  legend?: ReactNode;
  /** Laid over the board's top-right corner, e.g. view controls. */
  toolbar?: ReactNode;
  /** Height in px. Default: the container's height, at least `--circuit-graph-min-height`. */
  height?: number;
  /** Default: shown when there are more than twelve chips, never at 768 px and below. */
  minimap?: boolean;
  ariaLabel?: string;
  className?: string;
}

export interface CircuitLegendItem {
  key: string;
  label: ReactNode;
  tone?: CircuitTone;
  pattern?: CircuitWirePattern;
  ghost?: boolean;
  inferred?: boolean;
  highlighted?: boolean;
}

export interface CircuitLegendProps {
  items: CircuitLegendItem[];
  /** A line under the swatches, e.g. the thresholds behind the colours. */
  note?: ReactNode;
  /** Adds a control that folds the legend into a small button, e.g. on a small board. */
  collapsible?: boolean;
  /** With `collapsible`, opens folded. */
  defaultCollapsed?: boolean;
  className?: string;
}

/* ── Geometry (the CSS reads these through SIZE_VARS) ──────────────── */

const CHIP_WIDTH = 200;
const CHIP_WIDTH_EXPANDED = 304;
const STUB_WIDTH = 176;
const PAD_Y = 8;
const LABEL_LINE = 20;
const META_LINE = 16;
const TAG_ROW = 24;
const SECTION_HEIGHT = 20;
const PIN_ROW = 22;
const PINS_BOTTOM = 6;
const MAX_PINS_PER_SIDE = 8;

const RANK_SEP = 104;
const NODE_SEP = 20;
const CORNER_RADIUS = 6;

const SIZE_VARS = {
  '--aegis-circuit-pad-y': `${String(PAD_Y)}px`,
  '--aegis-circuit-label-line': `${String(LABEL_LINE)}px`,
  '--aegis-circuit-meta-line': `${String(META_LINE)}px`,
  '--aegis-circuit-tag-row': `${String(TAG_ROW)}px`,
  '--aegis-circuit-section-h': `${String(SECTION_HEIGHT)}px`,
  '--aegis-circuit-pin-row-h': `${String(PIN_ROW)}px`,
  '--aegis-circuit-pins-bottom': `${String(PINS_BOTTOM)}px`,
};

const TONE_RANK: Record<CircuitTone, number> = {
  alarm: 3,
  caution: 2,
  neutral: 1,
  faint: 0,
};

const GLYPHS: Record<string, ReactNode> = {
  service: <BlockOutlined />,
  database: <DatabaseOutlined />,
  cache: <ThunderboltOutlined />,
  gateway: <GatewayOutlined />,
  loadgen: <DashboardOutlined />,
  queue: <InboxOutlined />,
  external: <GlobalOutlined />,
  more: <EllipsisOutlined />,
};

/* ── Pins shown on an expanded chip ────────────────────────────────── */

interface PinColumn {
  pins: CircuitPin[];
  /** Pins folded into the "more" row. */
  hidden: number;
}

interface ChipShape {
  width: number;
  height: number;
  inPins: PinColumn;
  outPins: PinColumn;
}

const MORE_PIN = '+more';

function pinColumn(pins: CircuitPin[], wired: Set<string>): PinColumn {
  const first = pins.filter((pin) => wired.has(pin.id));
  const rest = pins.filter((pin) => !wired.has(pin.id));
  const ordered = [...first, ...rest];
  if (ordered.length <= MAX_PINS_PER_SIDE) {
    return { pins: ordered, hidden: 0 };
  }
  const shown = Math.max(first.length, MAX_PINS_PER_SIDE - 1);
  return {
    pins: ordered.slice(0, shown),
    hidden: ordered.length - shown,
  };
}

function headerHeight(chip: CircuitChip): number {
  return (
    PAD_Y * 2 +
    LABEL_LINE +
    (chip.meta === undefined || chip.meta === '' ? 0 : META_LINE) +
    (chip.tags === undefined || chip.tags.length === 0 ? 0 : TAG_ROW)
  );
}

function columnHeight(column: PinColumn): number {
  const rows = column.pins.length + (column.hidden > 0 ? 1 : 0);
  return rows === 0 ? 0 : SECTION_HEIGHT + rows * PIN_ROW;
}

function chipShape(
  chip: CircuitChip,
  expanded: boolean,
  wiredPins: Set<string>,
): ChipShape {
  const empty: PinColumn = { pins: [], hidden: 0 };
  if (chip.variant === 'stub') {
    return {
      width: STUB_WIDTH,
      height: headerHeight(chip),
      inPins: empty,
      outPins: empty,
    };
  }
  if (!expanded) {
    return {
      width: CHIP_WIDTH,
      height: headerHeight(chip),
      inPins: empty,
      outPins: empty,
    };
  }
  const pins = chip.pins ?? [];
  const inPins = pinColumn(
    pins.filter((pin) => pin.side === 'in'),
    wiredPins,
  );
  const outPins = pinColumn(
    pins.filter((pin) => pin.side === 'out'),
    wiredPins,
  );
  const body = columnHeight(inPins) + columnHeight(outPins);
  return {
    width: CHIP_WIDTH_EXPANDED,
    height: headerHeight(chip) + (body === 0 ? 0 : body + PINS_BOTTOM),
    inPins,
    outPins,
  };
}

/* ── Strands drawn for the current expansion ───────────────────────── */

interface DrawnStrand {
  key: string;
  wire: CircuitWire;
  strand?: CircuitStrand;
  sourceHandle: string;
  targetHandle: string;
  tone: CircuitTone;
  pattern: CircuitWirePattern;
  weight: number;
}

function handleFor(
  side: 'in' | 'out',
  pin: string | undefined,
  shape: ChipShape | undefined,
  expanded: boolean,
): string {
  if (!expanded || pin === undefined || shape === undefined) {
    return side;
  }
  const column = side === 'in' ? shape.inPins : shape.outPins;
  if (column.pins.some((p) => p.id === pin)) {
    return `${side}:${pin}`;
  }
  return column.hidden > 0 ? `${side}:${MORE_PIN}` : side;
}

function drawnStrands(
  wires: CircuitWire[],
  shapes: ReadonlyMap<string, ChipShape>,
  expanded: ReadonlySet<string>,
): DrawnStrand[] {
  return wires.flatMap((wire): DrawnStrand[] => {
    const base = {
      wire,
      tone: wire.tone ?? 'neutral',
      pattern: wire.pattern ?? 'solid',
      weight: wire.weight ?? 0,
    };
    const open = expanded.has(wire.source) || expanded.has(wire.target);
    if (!open || wire.strands === undefined || wire.strands.length === 0) {
      return [
        { ...base, key: wire.id, sourceHandle: 'out', targetHandle: 'in' },
      ];
    }
    const merged = new Map<string, DrawnStrand>();
    for (const strand of wire.strands) {
      const sourceHandle = handleFor(
        'out',
        strand.sourcePin,
        shapes.get(wire.source),
        expanded.has(wire.source),
      );
      const targetHandle = handleFor(
        'in',
        strand.targetPin,
        shapes.get(wire.target),
        expanded.has(wire.target),
      );
      const key = `${wire.id}::${sourceHandle}::${targetHandle}`;
      const drawn: DrawnStrand = {
        key,
        wire,
        strand,
        sourceHandle,
        targetHandle,
        tone: strand.tone ?? base.tone,
        pattern: strand.pattern ?? base.pattern,
        weight: strand.weight ?? base.weight,
      };
      const seen = merged.get(key);
      if (seen === undefined) {
        merged.set(key, drawn);
      } else {
        const stronger = TONE_RANK[drawn.tone] > TONE_RANK[seen.tone];
        merged.set(key, {
          ...(stronger ? drawn : seen),
          weight: Math.max(seen.weight, drawn.weight),
        });
      }
    }
    return [...merged.values()];
  });
}

/* ── Layout ────────────────────────────────────────────────────────── */

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How a trace runs between its two handles, in flow coordinates. */
interface TraceRoute {
  /** The points the layout kept clear for this wire alone, source to target. */
  via: Array<[number, number]>;
  /** The target sits left of the source: the trace leaves and arrives around both chips. */
  back?: { source: Rect; target: Rect };
  /** Where the wire's label sits, when the layout made room for it. */
  label?: [number, number];
}

interface BoardLayout {
  rects: Map<string, Rect>;
  /** By wire id. */
  routes: Map<string, TraceRoute>;
}

/** The link under review weighs this much more in the layout, so its chips sit side by side. */
const HIGHLIGHT_WEIGHT = 8;
const EDGE_SEP = 14;
/** A label's width per character and its padding, as the wire-label pill draws them. */
const LABEL_CHAR_WIDTH = 6.2;
const LABEL_PAD = 20;
const LABEL_HEIGHT = 22;
/** How far a trace runs straight out of a handle before it bends. */
const STUB = 12;
/** How far a backward trace keeps from the chips it passes round. */
const CLEARANCE = 10;

function pairKey(source: string, target: string): string {
  return `${source}\u0000${target}`;
}

function computeLayout(
  chips: CircuitChip[],
  wires: CircuitWire[],
  shapes: ReadonlyMap<string, ChipShape>,
): BoardLayout {
  const g = new graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    edgesep: EDGE_SEP,
    marginx: 24,
    marginy: 24,
  });
  for (const chip of chips) {
    const shape = shapes.get(chip.id);
    g.setNode(chip.id, {
      width: shape?.width ?? CHIP_WIDTH,
      height: shape?.height ?? headerHeight(chip),
    });
  }
  // One layout edge per pair of chips. Every edge gets its own route
  // through the gaps; a highlighted one is pulled short and straight, and
  // its label gets room of its own.
  const present = new Set(chips.map((c) => c.id));
  const labelled = new Set<string>();
  for (const wire of wires) {
    if (
      wire.source === wire.target ||
      !present.has(wire.source) ||
      !present.has(wire.target)
    ) {
      continue;
    }
    const highlighted = wire.highlighted === true;
    const label = highlighted ? (wire.label ?? '') : '';
    const pair = pairKey(wire.source, wire.target);
    const seen = g.edge(wire.source, wire.target) as EdgeLabel | undefined;
    if (seen !== undefined && (!highlighted || labelled.has(pair))) {
      continue;
    }
    if (label !== '') {
      labelled.add(pair);
    }
    g.setEdge(wire.source, wire.target, {
      weight: highlighted ? HIGHLIGHT_WEIGHT : 1,
      width: label === '' ? 0 : label.length * LABEL_CHAR_WIDTH + LABEL_PAD,
      height: label === '' ? 0 : LABEL_HEIGHT,
      labelpos: 'c',
    });
  }
  dagreLayout(g);

  const rects = new Map<string, Rect>();
  for (const chip of chips) {
    const n = g.node(chip.id) as {
      x?: number;
      y?: number;
      width: number;
      height: number;
    };
    rects.set(chip.id, {
      x: (n.x ?? 0) - n.width / 2,
      y: (n.y ?? 0) - n.height / 2,
      width: n.width,
      height: n.height,
    });
  }

  const routes = new Map<string, TraceRoute>();
  for (const wire of wires) {
    const source = rects.get(wire.source);
    const target = rects.get(wire.target);
    if (source === undefined || target === undefined) {
      continue;
    }
    const edge = g.edge(wire.source, wire.target) as
      | { points?: Array<{ x: number; y: number }>; x?: number; y?: number }
      | undefined;
    const via = (edge?.points ?? [])
      .slice(1, -1)
      .map((p): [number, number] => [p.x, p.y]);
    const hasLabel =
      labelled.has(pairKey(wire.source, wire.target)) &&
      edge?.x !== undefined &&
      edge.y !== undefined;
    routes.set(wire.id, {
      via,
      back: target.x < source.x + source.width ? { source, target } : undefined,
      label: hasLabel ? [edge.x ?? 0, edge.y ?? 0] : undefined,
    });
  }
  return { rects, routes };
}

/** A path through `points` with straight runs and rounded corners. */
function roundedPath(points: Array<[number, number]>): string {
  const clean = points.filter(
    (p, i) =>
      i === 0 ||
      Math.abs(p[0] - points[i - 1][0]) > 0.5 ||
      Math.abs(p[1] - points[i - 1][1]) > 0.5,
  );
  if (clean.length < 2) {
    return '';
  }
  let d = `M${String(clean[0][0])},${String(clean[0][1])}`;
  for (let i = 1; i < clean.length - 1; i += 1) {
    const [px, py] = clean[i - 1];
    const [x, y] = clean[i];
    const [nx, ny] = clean[i + 1];
    const inLen = Math.hypot(x - px, y - py);
    const outLen = Math.hypot(nx - x, ny - y);
    const r = Math.min(CORNER_RADIUS, inLen / 2, outLen / 2);
    const ax = x - ((x - px) / inLen) * r;
    const ay = y - ((y - py) / inLen) * r;
    const bx = x + ((nx - x) / outLen) * r;
    const by = y + ((ny - y) / outLen) * r;
    d += ` L${String(ax)},${String(ay)} Q${String(x)},${String(y)} ${String(bx)},${String(by)}`;
  }
  const last = clean[clean.length - 1];
  return `${d} L${String(last[0])},${String(last[1])}`;
}

/**
 * A smooth path through `points`, level at each of them, e.g. through the
 * gaps between columns: each step bends at its middle.
 */
function bumpPath(points: Array<[number, number]>): string {
  if (points.length < 2) {
    return '';
  }
  let d = `M${String(points[0][0])},${String(points[0][1])}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ` C${String(mx)},${String(y0)} ${String(mx)},${String(y1)} ${String(x1)},${String(y1)}`;
  }
  return d;
}

/** The trace from a source handle at (sx, sy) to a target handle at (tx, ty). */
function tracePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  route: TraceRoute | undefined,
): { d: string; mid: [number, number] } {
  const via = route?.via ?? [];
  const mid: [number, number] =
    via.length > 0
      ? via[Math.floor(via.length / 2)]
      : [(sx + tx) / 2, (sy + ty) / 2];
  if (route?.back !== undefined) {
    // Out of the source's right edge, round the source, along the route
    // the layout kept clear, round the target and into its left edge.
    const { source, target } = route.back;
    const firstY = via.length > 0 ? via[0][1] : ty;
    const lastY = via.length > 0 ? via[via.length - 1][1] : sy;
    const sourceY =
      firstY >= source.y + source.height / 2
        ? source.y + source.height + CLEARANCE
        : source.y - CLEARANCE;
    const targetY =
      lastY >= target.y + target.height / 2
        ? target.y + target.height + CLEARANCE
        : target.y - CLEARANCE;
    return {
      d: roundedPath([
        [sx, sy],
        [sx + STUB, sy],
        [sx + STUB, sourceY],
        [source.x - STUB, sourceY],
        ...via,
        [target.x + target.width + STUB, targetY],
        [tx - STUB, targetY],
        [tx - STUB, ty],
        [tx, ty],
      ]),
      mid,
    };
  }
  const inner = bumpPath([[sx + STUB, sy], ...via, [tx - STUB, ty]]).replace(
    /^M[^C]*/,
    '',
  );
  return {
    d: `M${String(sx)},${String(sy)} L${String(sx + STUB)},${String(sy)} ${inner} L${String(tx)},${String(ty)}`,
    mid,
  };
}

/* ── React Flow nodes and edges ────────────────────────────────────── */

interface ChipNodeData extends Record<string, unknown> {
  chip: CircuitChip;
  shape: ChipShape;
  expanded: boolean;
  selected: boolean;
  onToggle?: (chip: CircuitChip) => void;
}

type ChipFlowNode = Node<ChipNodeData, 'chip'>;

interface WireEdgeData extends Record<string, unknown> {
  drawn: DrawnStrand;
  route?: TraceRoute;
  selected: boolean;
  dimmed: boolean;
  showLabel: boolean;
}

type WireFlowEdge = Edge<WireEdgeData, 'wire'>;

function toneClass(prefix: string, tone: CircuitTone | undefined): string {
  return tone === undefined ? '' : `${prefix}--${tone}`;
}

function PinRow({
  pin,
  side,
}: {
  pin: CircuitPin;
  side: 'in' | 'out';
}): JSX.Element {
  return (
    <div
      className={[
        'aegis-circuit-graph__pin',
        `aegis-circuit-graph__pin--${side}`,
        toneClass('aegis-circuit-graph__pin', pin.tone),
      ]
        .filter(Boolean)
        .join(' ')}
      title={pin.title ?? pin.label}
    >
      <Handle
        type={side === 'in' ? 'target' : 'source'}
        position={side === 'in' ? Position.Left : Position.Right}
        id={`${side}:${pin.id}`}
        className="aegis-circuit-graph__pad"
        isConnectable={false}
      />
      <span className="aegis-circuit-graph__pin-label">{pin.label}</span>
      {pin.value !== undefined && pin.value !== '' && (
        <span className="aegis-circuit-graph__pin-value">{pin.value}</span>
      )}
    </div>
  );
}

function MorePinRow({
  side,
  count,
}: {
  side: 'in' | 'out';
  count: number;
}): JSX.Element {
  const strings = useStrings();
  return (
    <div
      className={[
        'aegis-circuit-graph__pin',
        `aegis-circuit-graph__pin--${side}`,
        'aegis-circuit-graph__pin--more',
      ].join(' ')}
    >
      <Handle
        type={side === 'in' ? 'target' : 'source'}
        position={side === 'in' ? Position.Left : Position.Right}
        id={`${side}:${MORE_PIN}`}
        className="aegis-circuit-graph__pad"
        isConnectable={false}
      />
      <span className="aegis-circuit-graph__pin-label">
        {strings.circuitMorePins(count)}
      </span>
    </div>
  );
}

function PinSection({
  side,
  column,
}: {
  side: 'in' | 'out';
  column: PinColumn;
}): JSX.Element | null {
  const strings = useStrings();
  if (column.pins.length === 0 && column.hidden === 0) {
    return null;
  }
  return (
    <div
      className={`aegis-circuit-graph__pins aegis-circuit-graph__pins--${side}`}
    >
      <div className="aegis-circuit-graph__pins-head">
        {side === 'in' ? strings.circuitPinsIn : strings.circuitPinsOut}
      </div>
      {column.pins.map((pin) => (
        <PinRow key={pin.id} pin={pin} side={side} />
      ))}
      {column.hidden > 0 && <MorePinRow side={side} count={column.hidden} />}
    </div>
  );
}

function ChipNodeView({ data }: NodeProps<ChipFlowNode>): JSX.Element {
  const strings = useStrings();
  const { chip, shape, expanded, selected, onToggle } = data;
  const stub = chip.variant === 'stub';
  const ghost = chip.variant === 'ghost';
  const canExpand =
    !stub && onToggle !== undefined && (chip.pins ?? []).length > 0;
  const handleToggle = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onToggle?.(chip);
  };
  const handleToggleKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    // The board answers Enter and Space on a focused chip; the button keeps them.
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  };
  return (
    <div
      className={[
        'aegis-circuit-graph__chip',
        stub ? 'aegis-circuit-graph__chip--stub' : '',
        ghost ? 'aegis-circuit-graph__chip--ghost' : '',
        expanded ? 'aegis-circuit-graph__chip--expanded' : '',
        chip.emphasis ? 'aegis-circuit-graph__chip--emphasis' : '',
        chip.faint === true ? 'aegis-circuit-graph__chip--faint' : '',
        selected ? 'aegis-circuit-graph__chip--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: shape.width, height: shape.height }}
    >
      <div className="aegis-circuit-graph__chip-head">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="aegis-circuit-graph__pad aegis-circuit-graph__pad--chip"
          isConnectable={false}
        />
        <div className="aegis-circuit-graph__chip-title">
          <span className="aegis-circuit-graph__glyph" aria-hidden="true">
            {GLYPHS[chip.kind ?? 'service'] ?? GLYPHS.service}
          </span>
          {chip.tone !== undefined && (
            <span
              className={`aegis-circuit-graph__dot aegis-circuit-graph__dot--${chip.tone}`}
              aria-hidden="true"
            />
          )}
          <span className="aegis-circuit-graph__chip-label" title={chip.label}>
            {chip.label}
          </span>
          {canExpand && (
            <button
              type="button"
              className="aegis-circuit-graph__toggle nodrag nopan"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? strings.circuitHidePins(chip.label)
                  : strings.circuitShowPins(chip.label)
              }
              onClick={handleToggle}
              onKeyDown={handleToggleKey}
            >
              {expanded ? <DownOutlined /> : <RightOutlined />}
            </button>
          )}
        </div>
        {chip.meta !== undefined && chip.meta !== '' && (
          <div className="aegis-circuit-graph__chip-meta" title={chip.meta}>
            {chip.meta}
          </div>
        )}
        {chip.tags !== undefined && chip.tags.length > 0 && (
          <div className="aegis-circuit-graph__chip-tags">
            {chip.tags.map((tag) => (
              <Chip
                key={tag.label}
                size="sm"
                tone={tag.tone ?? 'default'}
                inverted={selected}
              >
                {tag.label}
              </Chip>
            ))}
          </div>
        )}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="aegis-circuit-graph__pad aegis-circuit-graph__pad--chip"
          isConnectable={false}
        />
      </div>
      {expanded && (
        <>
          <PinSection side="in" column={shape.inPins} />
          <PinSection side="out" column={shape.outPins} />
        </>
      )}
    </div>
  );
}

const ChipNode = memo(ChipNodeView);

function WireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<WireFlowEdge>): JSX.Element | null {
  if (data === undefined) {
    return null;
  }
  const { drawn, route, selected, dimmed, showLabel } = data;
  const { wire } = drawn;
  const { d, mid } = tracePath(sourceX, sourceY, targetX, targetY, route);
  const [labelX, labelY] = route?.label ?? mid;
  const cls = [
    'aegis-circuit-graph__wire',
    `aegis-circuit-graph__wire--${drawn.tone}`,
    `aegis-circuit-graph__wire--${drawn.pattern}`,
    wire.highlighted ? 'aegis-circuit-graph__wire--highlighted' : '',
    wire.ghost ? 'aegis-circuit-graph__wire--ghost' : '',
    wire.inferred ? 'aegis-circuit-graph__wire--inferred' : '',
    selected ? 'aegis-circuit-graph__wire--selected' : '',
    dimmed ? 'aegis-circuit-graph__wire--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = {
    '--aegis-circuit-wire-weight': Math.min(Math.max(drawn.weight, 0), 1),
  } as CSSProperties;
  return (
    <>
      <g className={cls} style={style}>
        {wire.title !== undefined && <title>{wire.title}</title>}
        {(wire.highlighted === true || selected) && (
          <path d={d} className="aegis-circuit-graph__wire-halo" />
        )}
        {wire.ghost === true && (
          <path d={d} className="aegis-circuit-graph__wire-casing" />
        )}
        {wire.inferred === true && (
          <path d={d} className="aegis-circuit-graph__wire-ticks" />
        )}
        <path id={id} d={d} className="aegis-circuit-graph__wire-path" />
        <path
          className="aegis-circuit-graph__wire-arrow"
          d={`M${String(targetX - 7)},${String(targetY - 4)} L${String(targetX - 1)},${String(targetY)} L${String(targetX - 7)},${String(targetY + 4)}`}
        />
      </g>
      {showLabel && wire.label !== undefined && wire.label !== '' && (
        <EdgeLabelRenderer>
          <div
            className={[
              'aegis-circuit-graph__wire-label',
              selected ? 'aegis-circuit-graph__wire-label--selected' : '',
              wire.ghost ? 'aegis-circuit-graph__wire-label--ghost' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
            }}
          >
            {wire.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const NODE_TYPES = { chip: ChipNode };
const EDGE_TYPES = { wire: WireEdge };

const NARROW_QUERY = '(max-width: 768px)';
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2;
/**
 * The least zoom the board opens at, where a chip's label stays legible.
 * When the focus does not fit at it, the view fits the core chips and the
 * rest runs off the board.
 */
const LEGIBLE_ZOOM = 0.75;
const FIT_MARGIN = 32;
// React Flow insets its panels by 15 px; a control button is 26 px, 28
// inside the controls' border.
const PANEL_INSET = 15;
const CONTROLS_WIDTH = 28;
const MINIMAP_WIDTH = 200;
const MINIMAP_CHIP_COUNT = 12;
/** The toolbar's and the legend's inset from the board's edge (--space-3). */
const OVERLAY_INSET = 12;

const px = (value: number): `${number}px` => `${value}px`;

/** The viewport moved as little as needed to show `rect` inside the padding, its top first. */
function revealed(
  vp: Viewport,
  rect: Rect,
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number },
): Viewport {
  const left = vp.x + rect.x * vp.zoom;
  const top = vp.y + rect.y * vp.zoom;
  const right = left + rect.width * vp.zoom;
  const bottom = top + rect.height * vp.zoom;
  let dx = 0;
  let dy = 0;
  if (right > width - padding.right) {
    dx = width - padding.right - right;
  }
  if (left + dx < padding.left) {
    dx = padding.left - left;
  }
  if (bottom > height - padding.bottom) {
    dy = height - padding.bottom - bottom;
  }
  if (top + dy < padding.top) {
    dy = padding.top - top;
  }
  return dx === 0 && dy === 0
    ? vp
    : { x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom };
}

function boundsOf(rects: Rect[]): Rect | undefined {
  if (rects.length === 0) {
    return undefined;
  }
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y,
  };
}

function CircuitGraphInner({
  chips,
  wires,
  expandedIds = [],
  onToggleExpand,
  selectedChipId,
  selectedWireId,
  onSelectChip,
  onSelectWire,
  focus,
  legend,
  toolbar,
  height,
  minimap,
  ariaLabel,
  className,
}: CircuitGraphProps): JSX.Element {
  const strings = useStrings();
  const rfId = useStore((state) => state.rfId);
  const paneWidth = useStore((state) => state.width);
  const paneHeight = useStore((state) => state.height);
  const { setViewport, getViewport } = useReactFlow();
  const narrow = useMediaQuery(NARROW_QUERY);
  const showMinimap = (minimap ?? chips.length > MINIMAP_CHIP_COUNT) && !narrow;
  const [hoverChip, setHoverChip] = useState<string | null>(null);

  const expanded = useMemo(() => new Set(expandedIds), [expandedIds]);
  const present = useMemo(() => new Set(chips.map((c) => c.id)), [chips]);
  const visibleWires = useMemo(
    () =>
      wires.filter(
        (w) =>
          w.source !== w.target &&
          present.has(w.source) &&
          present.has(w.target),
      ),
    [wires, present],
  );
  const shapes = useMemo(() => {
    const wired = new Map<string, Set<string>>();
    const mark = (chip: string, pin: string | undefined): void => {
      if (pin === undefined) {
        return;
      }
      const set = wired.get(chip) ?? new Set<string>();
      set.add(pin);
      wired.set(chip, set);
    };
    for (const wire of visibleWires) {
      for (const strand of wire.strands ?? []) {
        mark(wire.source, strand.sourcePin);
        mark(wire.target, strand.targetPin);
      }
    }
    return new Map(
      chips.map((chip) => [
        chip.id,
        chipShape(
          chip,
          expanded.has(chip.id),
          wired.get(chip.id) ?? new Set<string>(),
        ),
      ]),
    );
  }, [chips, visibleWires, expanded]);
  const layout = useMemo(
    () => computeLayout(chips, visibleWires, shapes),
    [chips, visibleWires, shapes],
  );
  const strands = useMemo(
    () => drawnStrands(visibleWires, shapes, expanded),
    [visibleWires, shapes, expanded],
  );

  // The chip last expanded or folded keeps its place while the board re-lays out.
  const toggled = useRef<string | null>(null);
  const toggle = useCallback(
    (chip: CircuitChip) => {
      toggled.current = chip.id;
      onToggleExpand?.(chip);
    },
    [onToggleExpand],
  );
  const flowNodes = useMemo(
    (): ChipFlowNode[] =>
      chips.map((chip) => {
        const rect = layout.rects.get(chip.id);
        const shape = shapes.get(chip.id) ?? chipShape(chip, false, new Set());
        const selectable = onSelectChip !== undefined;
        return {
          id: chip.id,
          type: 'chip',
          position: { x: rect?.x ?? 0, y: rect?.y ?? 0 },
          width: shape.width,
          height: shape.height,
          ariaLabel: chip.label,
          ariaRole: 'group',
          domAttributes: {
            'aria-roledescription': strings.circuitChipRole,
            'aria-current': selectedChipId === chip.id ? true : undefined,
            'aria-describedby': selectable
              ? `react-flow__node-desc-${rfId}`
              : undefined,
          },
          data: {
            chip,
            shape,
            expanded: expanded.has(chip.id),
            selected: selectedChipId === chip.id,
            onToggle: onToggleExpand === undefined ? undefined : toggle,
          },
          draggable: false,
          connectable: false,
          selectable,
          focusable: selectable,
        };
      }),
    [
      chips,
      layout,
      shapes,
      expanded,
      selectedChipId,
      onSelectChip,
      onToggleExpand,
      toggle,
      rfId,
      strings,
    ],
  );

  const labelOf = useMemo(
    () => new Map(chips.map((c) => [c.id, c.label])),
    [chips],
  );
  const flowEdges = useMemo((): WireFlowEdge[] => {
    const labelled = new Set<string>();
    // The heaviest strand of a wire carries its label.
    const order = [...strands].sort((a, b) => b.weight - a.weight);
    for (const drawn of order) {
      if (!labelled.has(drawn.wire.id)) {
        labelled.add(drawn.wire.id);
        labelled.add(drawn.key);
      }
    }
    const selectable = onSelectWire !== undefined;
    return strands.map((drawn) => {
      const { wire } = drawn;
      const selected = selectedWireId === wire.id;
      const dimmed =
        hoverChip !== null &&
        wire.source !== hoverChip &&
        wire.target !== hoverChip;
      const emphasis =
        wire.ghost === true || wire.highlighted === true || selected;
      return {
        id: drawn.key,
        type: 'wire',
        source: wire.source,
        target: wire.target,
        sourceHandle: drawn.sourceHandle,
        targetHandle: drawn.targetHandle,
        ariaLabel: strings.circuitWireName(
          labelOf.get(wire.source) ?? wire.source,
          labelOf.get(wire.target) ?? wire.target,
        ),
        domAttributes: { 'aria-roledescription': strings.circuitWireRole },
        data: {
          drawn,
          route: layout.routes.get(wire.id),
          selected,
          dimmed,
          showLabel: labelled.has(drawn.key),
        },
        selectable,
        focusable: selectable,
        interactionWidth: 14,
        // Emphasised wires draw over the rest.
        zIndex: emphasis ? 1 : 0,
      };
    });
  }, [
    strands,
    layout,
    selectedWireId,
    hoverChip,
    onSelectWire,
    labelOf,
    strings,
  ]);

  /* ── The view: open on the focus, then keep the anchor still ──────── */

  // The toolbar and legend lie over the board; the fit keeps chips clear of them.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const [overlays, setOverlays] = useState({ top: 0, bottom: 0 });
  const hasToolbar = toolbar !== undefined;
  const hasLegend = legend !== undefined;
  useEffect(() => {
    const measure = (): void => {
      const top = toolbarRef.current?.offsetHeight ?? 0;
      const bottom = legendRef.current?.offsetHeight ?? 0;
      setOverlays((old) =>
        old.top === top && old.bottom === bottom ? old : { top, bottom },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [toolbarRef.current, legendRef.current]) {
      if (el !== null) {
        observer.observe(el);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [hasToolbar, hasLegend]);
  const padding = useMemo(
    () => ({
      top: FIT_MARGIN + (overlays.top > 0 ? overlays.top + OVERLAY_INSET : 0),
      bottom:
        FIT_MARGIN +
        (overlays.bottom > 0 ? overlays.bottom + OVERLAY_INSET : 0),
      left: PANEL_INSET + CONTROLS_WIDTH + FIT_MARGIN,
      right: showMinimap
        ? PANEL_INSET + MINIMAP_WIDTH + FIT_MARGIN
        : FIT_MARGIN,
    }),
    [showMinimap, overlays],
  );
  const fitPadding = useMemo(
    () => ({
      top: px(padding.top),
      bottom: px(padding.bottom),
      left: px(padding.left),
      right: px(padding.right),
    }),
    [padding],
  );
  const focusKey = JSON.stringify([
    focus?.ids ?? [],
    focus?.core ?? [],
    focus?.key ?? null,
  ]);
  const fitTo = useCallback(
    (ids: string[], core: string[]): Viewport | undefined => {
      if (paneWidth === 0 || paneHeight === 0) {
        return undefined;
      }
      const pick = (list: string[]): Rect[] =>
        list.flatMap((id) => {
          const r = layout.rects.get(id);
          return r === undefined ? [] : [r];
        });
      const all = boundsOf(pick(ids.length > 0 ? ids : [...present]));
      if (all === undefined) {
        return undefined;
      }
      const whole = getViewportForBounds(
        all,
        paneWidth,
        paneHeight,
        MIN_ZOOM,
        1,
        fitPadding,
      );
      if (whole.zoom >= LEGIBLE_ZOOM || ids.length === 0) {
        return whole;
      }
      // Too much to read at once: open on the core, grown by the chips
      // that still fit with it at a legible zoom; the rest runs off the edge.
      const coreRects = pick(core.length > 0 ? core : ids.slice(0, 1));
      let box = boundsOf(coreRects);
      if (box === undefined) {
        return whole;
      }
      const roomWidth =
        (paneWidth - padding.left - padding.right) / LEGIBLE_ZOOM;
      const roomHeight =
        (paneHeight - padding.top - padding.bottom) / LEGIBLE_ZOOM;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const distance = (r: Rect): number =>
        Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy);
      // A collapsed group wired to the core says what else is there: it
      // goes in first, then the chips nearest the core.
      const coreIds = new Set(core);
      const telling = new Set(
        chips
          .filter(
            (c) =>
              c.variant === 'stub' &&
              wires.some(
                (w) =>
                  (w.source === c.id && coreIds.has(w.target)) ||
                  (w.target === c.id && coreIds.has(w.source)),
              ),
          )
          .map((c) => c.id),
      );
      const nearest = ids
        .flatMap((id) => {
          const rect = layout.rects.get(id);
          return rect === undefined
            ? []
            : [{ rect, first: telling.has(id) ? 0 : 1 }];
        })
        .sort(
          (a, b) => a.first - b.first || distance(a.rect) - distance(b.rect),
        )
        .map((entry) => entry.rect);
      for (const rect of nearest) {
        const grown = boundsOf([box, rect]);
        if (
          grown !== undefined &&
          grown.width <= roomWidth &&
          grown.height <= roomHeight
        ) {
          box = grown;
        }
      }
      return getViewportForBounds(
        box,
        paneWidth,
        paneHeight,
        LEGIBLE_ZOOM,
        1,
        fitPadding,
      );
    },
    [paneWidth, paneHeight, layout, present, padding, fitPadding, chips, wires],
  );

  const fitted = useRef<string | null>(null);
  // Until the user pans or zooms, a resized pane fits the focus again,
  // e.g. when a side panel beside the board opens at its stored width.
  const userMoved = useRef(false);
  const fittedSize = useRef('');
  const placed = useRef<Map<string, Rect> | null>(null);
  useEffect(() => {
    if (paneWidth === 0 || paneHeight === 0 || chips.length === 0) {
      return;
    }
    const size = `${String(paneWidth)}x${String(paneHeight)}`;
    if (
      fitted.current !== focusKey ||
      (!userMoved.current && fittedSize.current !== size)
    ) {
      const next = fitTo(focus?.ids ?? [], focus?.core ?? []);
      if (next !== undefined) {
        void setViewport(next);
        fitted.current = focusKey;
        fittedSize.current = size;
        userMoved.current = false;
      }
    } else if (placed.current !== null && placed.current !== layout.rects) {
      // A new layout: the chip just toggled, else the selected one, else
      // the first core chip, stays where it was on screen.
      const before = placed.current;
      const anchorId = [
        toggled.current ?? undefined,
        selectedChipId,
        ...(focus?.core ?? focus?.ids ?? []),
      ].find(
        (id): id is string =>
          id !== undefined && before.has(id) && layout.rects.has(id),
      );
      const from = anchorId === undefined ? undefined : before.get(anchorId);
      const to =
        anchorId === undefined ? undefined : layout.rects.get(anchorId);
      const vp = getViewport();
      let next = vp;
      if (
        from !== undefined &&
        to !== undefined &&
        (from.x !== to.x || from.y !== to.y)
      ) {
        next = {
          x: vp.x - (to.x - from.x) * vp.zoom,
          y: vp.y - (to.y - from.y) * vp.zoom,
          zoom: vp.zoom,
        };
      }
      // A chip just expanded comes fully into view, its top first.
      const opened =
        toggled.current === null
          ? undefined
          : layout.rects.get(toggled.current);
      if (opened !== undefined) {
        next = revealed(next, opened, paneWidth, paneHeight, padding);
      }
      if (next !== vp) {
        void setViewport(next);
      }
      toggled.current = null;
    }
    placed.current = layout.rects;
  }, [
    layout,
    focusKey,
    focus,
    fitTo,
    selectedChipId,
    paneWidth,
    paneHeight,
    chips.length,
    setViewport,
    getViewport,
    padding,
  ]);

  const refocus = useCallback(() => {
    const next = fitTo(focus?.ids ?? [], focus?.core ?? []);
    if (next !== undefined) {
      userMoved.current = false;
      void setViewport(next, { duration: 240 });
    }
  }, [fitTo, focus, setViewport]);
  const handleMoveStart = useCallback((event: unknown) => {
    // Programmatic moves pass no event.
    if (event !== null) {
      userMoved.current = true;
    }
  }, []);

  /* ── Events ──────────────────────────────────────────────────────── */

  const handleNodeClick = useCallback(
    (_: unknown, node: ChipFlowNode) => {
      onSelectChip?.(node.data.chip);
    },
    [onSelectChip],
  );
  const handleNodeDoubleClick = useCallback(
    (_: unknown, node: ChipFlowNode) => {
      if (node.data.chip.variant !== 'stub' && onToggleExpand !== undefined) {
        toggle(node.data.chip);
      }
    },
    [onToggleExpand, toggle],
  );
  const handleEdgeClick = useCallback(
    (_: unknown, edge: WireFlowEdge) => {
      if (edge.data) {
        onSelectWire?.(edge.data.drawn.wire, edge.data.drawn.strand);
      }
    },
    [onSelectWire],
  );
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
        const chip = chips.find((c) => c.id === id);
        if (chip && onSelectChip) {
          event.preventDefault();
          onSelectChip(chip);
        }
      } else if (target.classList.contains('react-flow__edge')) {
        const drawn = strands.find((s) => s.key === id);
        if (drawn && onSelectWire) {
          event.preventDefault();
          onSelectWire(drawn.wire, drawn.strand);
        }
      }
    },
    [chips, strands, onSelectChip, onSelectWire],
  );
  const handleNodeEnter = useCallback((_: unknown, node: ChipFlowNode) => {
    setHoverChip(node.id);
  }, []);
  const handleNodeLeave = useCallback(() => {
    setHoverChip(null);
  }, []);

  const style = {
    ...SIZE_VARS,
    '--aegis-circuit-minimap-w': px(PANEL_INSET + MINIMAP_WIDTH),
    height: height === undefined ? undefined : `${String(height)}px`,
  } as CSSProperties;

  return (
    <div
      className={['aegis-circuit-graph', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="aegis-circuit-graph__pane">
        <ReactFlow
          aria-label={ariaLabel}
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          ariaLabelConfig={strings.circuitGraphAriaLabels}
          onNodeClick={onSelectChip ? handleNodeClick : undefined}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMouseEnter={handleNodeEnter}
          onNodeMouseLeave={handleNodeLeave}
          onEdgeClick={onSelectWire ? handleEdgeClick : undefined}
          onKeyDown={handleKeyDown}
          onMoveStart={handleMoveStart}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} position="top-left">
            {focus !== undefined && (
              <ControlButton
                onClick={refocus}
                title={strings.circuitFitFocus}
                aria-label={strings.circuitFitFocus}
              >
                <AimOutlined />
              </ControlButton>
            )}
          </Controls>
          {showMinimap && (
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              style={{ width: MINIMAP_WIDTH }}
            />
          )}
        </ReactFlow>
      </div>
      {toolbar !== undefined && (
        <div ref={toolbarRef} className="aegis-circuit-graph__toolbar">
          {toolbar}
        </div>
      )}
      {legend !== undefined && (
        <div
          ref={legendRef}
          className={[
            'aegis-circuit-graph__legend',
            showMinimap ? 'aegis-circuit-graph__legend--beside-minimap' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {legend}
        </div>
      )}
    </div>
  );
}

/**
 * A graph drawn as a circuit board: chips joined by wires, laid out left
 * to right in the direction the wires run. A chip expands to list its
 * pins, and the wires it joins then run to those pins. The host owns
 * expansion and selection; the board opens on `focus`.
 */
export function CircuitGraph(props: CircuitGraphProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <CircuitGraphInner {...props} />
    </ReactFlowProvider>
  );
}

/** What a CircuitGraph's wire colours and patterns mean, with an optional note. */
export function CircuitLegend({
  items,
  note,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: CircuitLegendProps): JSX.Element {
  const strings = useStrings();
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const cls = ['aegis-circuit-legend', className ?? '']
    .filter(Boolean)
    .join(' ');
  if (collapsible && collapsed) {
    return (
      <button
        type="button"
        className={`${cls} aegis-circuit-legend--folded`}
        aria-expanded={false}
        onClick={() => {
          setCollapsed(false);
        }}
      >
        {strings.circuitLegend}
      </button>
    );
  }
  return (
    <div className={cls}>
      {collapsible && (
        <button
          type="button"
          className="aegis-circuit-legend__fold"
          aria-expanded
          aria-label={strings.circuitHideLegend}
          title={strings.circuitHideLegend}
          onClick={() => {
            setCollapsed(true);
          }}
        >
          <CloseOutlined />
        </button>
      )}
      <ul className="aegis-circuit-legend__items">
        {items.map((item) => (
          <li key={item.key} className="aegis-circuit-legend__item">
            <svg
              className={[
                'aegis-circuit-legend__swatch',
                'aegis-circuit-graph__wire',
                `aegis-circuit-graph__wire--${item.tone ?? 'neutral'}`,
                `aegis-circuit-graph__wire--${item.pattern ?? 'solid'}`,
                item.ghost ? 'aegis-circuit-graph__wire--ghost' : '',
                item.inferred ? 'aegis-circuit-graph__wire--inferred' : '',
                item.highlighted
                  ? 'aegis-circuit-graph__wire--highlighted'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              viewBox="0 0 28 12"
              aria-hidden="true"
            >
              {item.highlighted === true && (
                <path
                  d="M2,6 L26,6"
                  className="aegis-circuit-graph__wire-halo"
                />
              )}
              {item.ghost === true && (
                <path
                  d="M2,6 L26,6"
                  className="aegis-circuit-graph__wire-casing"
                />
              )}
              {item.inferred === true && (
                <path
                  d="M2,6 L26,6"
                  className="aegis-circuit-graph__wire-ticks"
                />
              )}
              <path d="M2,6 L26,6" className="aegis-circuit-graph__wire-path" />
            </svg>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      {note !== undefined && (
        <div className="aegis-circuit-legend__note">{note}</div>
      )}
    </div>
  );
}
