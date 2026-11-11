import type {
  CircuitChip,
  CircuitChipTag,
  CircuitPin,
  CircuitWire,
} from '@lincyaw/aegis-ui';
import type {
  ClaimedLink,
  GraphLink,
  GraphNode,
  Item,
  StatsPair,
  Topology,
} from '@lincyaw/review-api';

import type { ReviewStrings } from '../locale/context';

import {
  changeRank,
  changeShort,
  type Classified,
  classify,
  patternOf,
  toneOf,
} from './classify';
import { fmtCount, fmtMs, fmtMsBare, fmtPct } from './format';

/** How many of a chip's neighbours the focused view draws before a stub. */
const MAX_CALLERS = 4;
const MAX_CALLEES = 6;
const MAX_TARGET_CALLEES = 5;
const MAX_PATH = 6;

export const FAULT_TAG = 'fault-target';
export const FAULT_PEER_TAG = 'fault-peer';
export const NO_TRACES_TAG = 'no-traces';

const ZERO_STATS: StatsPair = {
  normal: { calls: 0, errorRate: 0 },
  abnormal: { calls: 0, errorRate: 0 },
};

export function ghostId(claim: ClaimedLink): string {
  return `claimed:${claim.source}:${claim.target}`;
}

export function stubId(nodeId: string, side: 'in' | 'out'): string {
  return `more:${side}:${nodeId}`;
}

export function parseStub(
  id: string
): { nodeId: string; side: 'in' | 'out' } | null {
  const m = /^more:(in|out):(.+)$/.exec(id);
  return m ? { side: m[1] as 'in' | 'out', nodeId: m[2] } : null;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  links: Map<string, GraphLink>;
  out: Map<string, GraphLink[]>;
  into: Map<string, GraphLink[]>;
  /** The most calls on any link in either window, for wire widths. */
  maxCalls: number;
}

/** The services an item names: its focus and both ends of each claimed link. */
export function namedIds(item: Item): string[] {
  return [
    ...item.focus.nodeIds,
    ...item.focus.claimedLinks.flatMap((c) => [c.source, c.target]),
  ];
}

/**
 * Indexes a case's topology. A service in `named` that the topology lacks
 * gets an empty node, so the board can still draw it, as a ghost.
 */
export function indexGraph(
  topology: Topology,
  named: readonly string[] = []
): Graph {
  const nodes = new Map(topology.nodes.map((n) => [n.id, n]));
  for (const id of named) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: id,
        kind: 'service',
        tags: [],
        ports: [],
        stats: ZERO_STATS,
        hasDetail: false,
      });
    }
  }
  const out = new Map<string, GraphLink[]>();
  const into = new Map<string, GraphLink[]>();
  for (const link of topology.links) {
    if (link.source === link.target) {
      continue;
    }
    out.set(link.source, [...(out.get(link.source) ?? []), link]);
    into.set(link.target, [...(into.get(link.target) ?? []), link]);
  }
  return {
    nodes,
    links: new Map(topology.links.map((l) => [l.id, l])),
    out,
    into,
    maxCalls: Math.max(
      1,
      ...topology.links.map((l) => {
        const st = linkStats(l);
        return Math.max(st.normal.calls, st.abnormal.calls);
      })
    ),
  };
}

export function findLink(
  graph: Graph,
  source: string,
  target: string
): GraphLink | undefined {
  return graph.out.get(source)?.find((l) => l.target === target);
}

export function faultTargets(graph: Graph): string[] {
  return [...graph.nodes.values()]
    .filter((n) => n.tags.includes(FAULT_TAG))
    .map((n) => n.id);
}

function volume(stats: StatsPair): number {
  return stats.normal.calls + stats.abnormal.calls;
}

function unwired(graph: Graph, node: GraphNode): boolean {
  return (
    node.ports.length === 0 &&
    (graph.out.get(node.id) ?? []).length === 0 &&
    (graph.into.get(node.id) ?? []).length === 0
  );
}

/** No spans, metrics or logs from the node in either window. */
export function noTelemetry(graph: Graph, node: GraphNode): boolean {
  return !node.hasDetail && volume(node.stats) === 0 && unwired(graph, node);
}

/** Seen only in metrics or logs, on no wire: e.g. a database nothing traced reached. */
function idle(graph: Graph, node: GraphNode): boolean {
  return volume(node.stats) === 0 && unwired(graph, node);
}

export type LinkBasis = NonNullable<GraphLink['basis']>;

/** Whose spans a link's calls were counted from. */
export function basisOf(link: GraphLink): LinkBasis {
  return link.basis ?? 'spans';
}

/**
 * The stats a link is drawn, ranked and listed by: the calls as the caller
 * measured them when the link has that view (they include the time on the
 * network and the calls that never reached the callee), else its own stats.
 */
export function linkStats(link: GraphLink): StatsPair {
  return link.callerStats ?? link.stats;
}

/** The most telling links first: the bigger change, then the more calls. */
function byInterest(a: GraphLink, b: GraphLink): number {
  return (
    changeRank(classify(linkStats(b))) - changeRank(classify(linkStats(a))) ||
    volume(linkStats(b)) - volume(linkStats(a))
  );
}

/**
 * The shortest chain of links from `from` to `to`, both included: following
 * calls only, or links in either direction when `directed` is false.
 */
function shortestPath(
  graph: Graph,
  from: string,
  to: string,
  directed: boolean
): string[] {
  if (from === to) {
    return [from];
  }
  const steps = (id: string): string[] => [
    ...(graph.out.get(id) ?? []).map((l) => l.target),
    ...(directed ? [] : (graph.into.get(id) ?? []).map((l) => l.source)),
  ];
  const previous = new Map<string, string>([[from, from]]);
  let frontier = [from];
  for (let depth = 0; depth < MAX_PATH && frontier.length > 0; depth += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const step of steps(id)) {
        if (previous.has(step)) {
          continue;
        }
        previous.set(step, id);
        if (step === to) {
          const path = [to];
          let back = to;
          while (back !== from) {
            back = previous.get(back) ?? from;
            path.unshift(back);
          }
          return path;
        }
        next.push(step);
      }
    }
    frontier = next;
  }
  return [];
}

/**
 * How a fault target connects to the claim: the shortest chain of calls
 * between it and either end, in either direction, else the shortest chain
 * of links regardless of direction (a fault often travels up to a caller
 * and down again).
 */
function faultPath(graph: Graph, item: Item, fault: string): string[] {
  const ends = claimEnds(item);
  const shortest = (paths: string[][]): string[] =>
    paths
      .filter((p) => p.length > 0)
      .reduce<
        string[]
      >((best, p) => (best.length === 0 || p.length < best.length ? p : best), []);
  const directed = shortest(
    ends.flatMap((end) => [
      shortestPath(graph, end, fault, true),
      shortestPath(graph, fault, end, true),
    ])
  );
  return directed.length > 0
    ? directed
    : shortest(ends.map((end) => shortestPath(graph, fault, end, false)));
}

/** The nodes the focused view opens on: the claim and its neighbourhood. */
export function focusNodes(graph: Graph, item: Item): Set<string> {
  const visible = new Set<string>();
  const add = (id: string): void => {
    if (graph.nodes.has(id)) {
      visible.add(id);
    }
  };
  item.focus.nodeIds.forEach(add);
  const faults = faultTargets(graph);
  faults.forEach(add);
  for (const claim of item.focus.claimedLinks) {
    add(claim.source);
    add(claim.target);
    [...(graph.into.get(claim.source) ?? [])]
      .sort(byInterest)
      .slice(0, MAX_CALLERS)
      .forEach((l) => {
        add(l.source);
      });
    [...(graph.out.get(claim.source) ?? [])]
      .filter((l) => l.target !== claim.target)
      .sort(byInterest)
      .slice(0, MAX_CALLEES)
      .forEach((l) => {
        add(l.target);
      });
    [...(graph.out.get(claim.target) ?? [])]
      .sort(byInterest)
      .slice(0, MAX_TARGET_CALLEES)
      .forEach((l) => {
        add(l.target);
      });
  }
  for (const fault of faults) {
    faultPath(graph, item, fault).forEach(add);
  }
  return visible;
}

/**
 * The links the focused view draws: those that touch a pivot (the claim's
 * two ends, and any chip whose neighbours the reviewer added), and those
 * that connect a fault target to the claim.
 */
export function focusLinks(
  graph: Graph,
  item: Item,
  pivots: ReadonlySet<string>
): Set<string> {
  const ids = new Set<string>();
  for (const link of graph.links.values()) {
    if (pivots.has(link.source) || pivots.has(link.target)) {
      ids.add(link.id);
    }
  }
  for (const fault of faultTargets(graph)) {
    const path = faultPath(graph, item, fault);
    for (let i = 1; i < path.length; i += 1) {
      const link =
        findLink(graph, path[i - 1], path[i]) ??
        findLink(graph, path[i], path[i - 1]);
      if (link !== undefined) {
        ids.add(link.id);
      }
    }
  }
  return ids;
}

/** The claim's two ends: the chips whose links the focused view always draws. */
export function claimEnds(item: Item): string[] {
  return [
    ...new Set(item.focus.claimedLinks.flatMap((c) => [c.source, c.target])),
  ];
}

/** A node with every node it calls or is called by. */
export function neighbours(graph: Graph, id: string): string[] {
  return [
    ...(graph.out.get(id) ?? []).map((l) => l.target),
    ...(graph.into.get(id) ?? []).map((l) => l.source),
  ];
}

/* ── Chips and wires ───────────────────────────────────────────────── */

export function statLine(
  stats: StatsPair,
  c: Classified,
  s: ReviewStrings
): string {
  const { normal, abnormal } = stats;
  switch (c.change) {
    case 'none':
      return s.noCallsEither;
    case 'vanished':
      return s.callsChange(fmtCount(normal.calls), '0');
    case 'new':
      return s.callsChange('0', fmtCount(abnormal.calls));
    case 'errors':
      return s.errorsChange(
        fmtPct(normal.errorRate),
        fmtPct(abnormal.errorRate)
      );
    case 'slower':
    case 'steady':
      return `p95 ${fmtMsBare(normal.p95Ms)} → ${fmtMs(abnormal.p95Ms)}`;
  }
}

function nodeMeta(node: GraphNode, s: ReviewStrings): string {
  const c = classify(node.stats);
  const { normal, abnormal } = node.stats;
  switch (c.change) {
    case 'none':
      return s.noSpansServed;
    case 'vanished':
      return s.spansChange(fmtCount(normal.calls), '0');
    case 'new':
      return s.spansChange('0', fmtCount(abnormal.calls));
    case 'errors':
    case 'slower':
    case 'steady':
      return statLine(node.stats, c, s);
  }
}

function statsTitle(stats: StatsPair, s: ReviewStrings): string {
  const { normal: n, abnormal: a } = stats;
  return [
    s.callsChange(fmtCount(n.calls), fmtCount(a.calls)),
    s.errorsChange(fmtPct(n.errorRate), fmtPct(a.errorRate)),
    `p50 ${fmtMs(n.p50Ms)} → ${fmtMs(a.p50Ms)}`,
    `p95 ${fmtMs(n.p95Ms)} → ${fmtMs(a.p95Ms)}`,
  ].join(' · ');
}

export function tagLabel(tag: string, s: ReviewStrings): CircuitChipTag {
  switch (tag) {
    case FAULT_TAG:
      return { label: s.tagFaultTarget, tone: 'caution' };
    case FAULT_PEER_TAG:
      return { label: s.tagFaultPeer, tone: 'caution' };
    case NO_TRACES_TAG:
      return { label: s.tagNoTraces };
    default:
      return { label: tag.replace(/[-_]/g, ' ') };
  }
}

function chipOf(
  graph: Graph,
  node: GraphNode,
  item: Item,
  s: ReviewStrings
): CircuitChip {
  const c = classify(node.stats);
  const callers = item.focus.claimedLinks.map((l) => l.source);
  const callees = item.focus.claimedLinks.map((l) => l.target);
  const roles: CircuitChipTag[] = [
    ...(callers.includes(node.id)
      ? [{ label: s.roleCaller, tone: 'ink' as const }]
      : []),
    ...(callees.includes(node.id)
      ? [{ label: s.roleCallee, tone: 'ink' as const }]
      : []),
  ];
  const pins: CircuitPin[] = [...node.ports]
    .sort(
      (a, b) =>
        (b.stats ? volume(b.stats) : 0) - (a.stats ? volume(a.stats) : 0)
    )
    .map((port) => {
      const pc = port.stats ? classify(port.stats) : undefined;
      return {
        id: port.id,
        label: port.label,
        side: port.role === 'server' ? 'in' : 'out',
        tone:
          pc === undefined || pc.change === 'steady'
            ? undefined
            : toneOf(pc.change),
        value: pc === undefined ? undefined : changeShort(pc, s),
        title: port.stats
          ? `${port.label}\n${statsTitle(port.stats, s)}`
          : port.label,
      };
    });
  const ghost = noTelemetry(graph, node);
  const traced = !node.tags.includes(NO_TRACES_TAG);
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    tags: [...roles, ...node.tags.map((tag) => tagLabel(tag, s))],
    meta: ghost
      ? s.noTelemetryMeta
      : traced
        ? nodeMeta(node, s)
        : s.metricsLogsOnly,
    variant: ghost ? 'ghost' : undefined,
    faint:
      !ghost &&
      roles.length === 0 &&
      !node.tags.includes(FAULT_TAG) &&
      idle(graph, node),
    tone:
      c.change === 'errors'
        ? 'alarm'
        : c.change === 'slower'
          ? 'caution'
          : c.change === 'vanished'
            ? 'neutral'
            : undefined,
    pins,
    emphasis: callers.includes(node.id) || callees.includes(node.id),
  };
}

function weightOf(graph: Graph, stats: StatsPair): number {
  const calls = Math.max(stats.normal.calls, stats.abnormal.calls);
  return Math.log10(1 + calls) / Math.log10(1 + graph.maxCalls);
}

export interface Board {
  chips: CircuitChip[];
  wires: CircuitWire[];
  core: string[];
}

export interface BoardOptions {
  /** The wire whose figures are written on it, besides the claimed one. */
  selectedWire: string | undefined;
  /** Placeholder chips for the neighbours of the claim's ends not drawn. */
  stubs: boolean;
  /** Only these links are drawn; all of them between drawn chips when undefined. */
  links: ReadonlySet<string> | undefined;
  s: ReviewStrings;
}

export function buildBoard(
  graph: Graph,
  item: Item,
  visible: ReadonlySet<string>,
  { selectedWire, stubs: showStubs, links, s }: BoardOptions
): Board {
  const claimed = new Set(
    item.focus.claimedLinks.map((c) => `${c.source}\u0000${c.target}`)
  );
  const chips: CircuitChip[] = [...visible].flatMap((id) => {
    const node = graph.nodes.get(id);
    return node === undefined ? [] : [chipOf(graph, node, item, s)];
  });
  const wires: CircuitWire[] = [];
  for (const link of graph.links.values()) {
    if (
      link.source === link.target ||
      !visible.has(link.source) ||
      !visible.has(link.target) ||
      (links !== undefined && !links.has(link.id))
    ) {
      continue;
    }
    const st = linkStats(link);
    const c = classify(st);
    const isClaimed = claimed.has(`${link.source}\u0000${link.target}`);
    const basis = basisOf(link);
    wires.push({
      id: link.id,
      source: link.source,
      target: link.target,
      tone: toneOf(c.change),
      pattern: patternOf(c.change),
      weight: weightOf(graph, st),
      highlighted: isClaimed,
      inferred: basis !== 'spans',
      label:
        isClaimed || selectedWire === link.id ? statLine(st, c, s) : undefined,
      title: [
        `${link.source} → ${link.target}`,
        ...(link.callerStats === undefined
          ? [statsTitle(link.stats, s)]
          : [
              `${s.viewCaller}: ${statsTitle(link.callerStats, s)}`,
              `${s.viewCallee}: ${statsTitle(link.stats, s)}`,
            ]),
        ...(basis === 'spans' ? [] : [s.basisTitle[basis]]),
      ].join('\n'),
      strands: link.ports.map((pl) => {
        const pc = classify(pl.stats);
        return {
          sourcePin: pl.sourcePort,
          targetPin: pl.targetPort,
          tone: toneOf(pc.change),
          pattern: patternOf(pc.change),
          weight: weightOf(graph, pl.stats),
        };
      }),
    });
  }
  for (const claim of item.focus.claimedLinks) {
    if (
      findLink(graph, claim.source, claim.target) === undefined &&
      visible.has(claim.source) &&
      visible.has(claim.target)
    ) {
      wires.push({
        id: ghostId(claim),
        source: claim.source,
        target: claim.target,
        ghost: true,
        highlighted: true,
        label: s.noCallsEither,
        title: s.ghostWireTitle(claim.source, claim.target),
      });
    }
  }
  if (showStubs) {
    const stubbed = new Set<string>();
    for (const claim of item.focus.claimedLinks) {
      for (const [nodeId, side] of [
        [claim.source, 'in'],
        [claim.source, 'out'],
        [claim.target, 'out'],
      ] as const) {
        const key = stubId(nodeId, side);
        if (stubbed.has(key) || !visible.has(nodeId)) {
          continue;
        }
        stubbed.add(key);
        const hidden = (
          side === 'out'
            ? (graph.out.get(nodeId) ?? []).map((l) => l.target)
            : (graph.into.get(nodeId) ?? []).map((l) => l.source)
        ).filter((id) => !visible.has(id) && id !== nodeId);
        if (hidden.length === 0) {
          continue;
        }
        chips.push({
          id: key,
          label:
            side === 'out'
              ? s.moreCallees(hidden.length)
              : s.moreCallers(hidden.length),
          kind: 'more',
          variant: 'stub',
          meta: s.stubOf(nodeId),
        });
        wires.push({
          id: `${key}:wire`,
          source: side === 'out' ? nodeId : key,
          target: side === 'out' ? key : nodeId,
          tone: 'faint',
          weight: 0,
        });
      }
    }
  }
  return { chips, wires, core: claimEnds(item) };
}
