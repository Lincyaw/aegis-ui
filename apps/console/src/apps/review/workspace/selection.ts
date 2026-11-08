import type { Item } from '@lincyaw/review-api';

import { findLink, ghostId, type Graph } from '../evidence/board';

/** What the details panel shows: a link (maybe one endpoint pair), a claimed link with no calls, or a node. */
export type Selection =
  | {
      kind: 'link';
      id: string;
      pair?: { sourcePort: string; targetPort: string };
    }
  | { kind: 'ghost'; id: string; source: string; target: string }
  | { kind: 'node'; id: string };

/** The item's first claimed link, observed or not. */
export function claimSelection(
  graph: Graph | undefined,
  item: Item
): Selection | undefined {
  const claim = item.focus.claimedLinks[0] as
    | (typeof item.focus.claimedLinks)[number]
    | undefined;
  if (claim === undefined) {
    const first = item.focus.nodeIds[0] as string | undefined;
    return first === undefined ? undefined : { kind: 'node', id: first };
  }
  const link =
    graph === undefined
      ? undefined
      : findLink(graph, claim.source, claim.target);
  return link === undefined
    ? {
        kind: 'ghost',
        id: ghostId(claim),
        source: claim.source,
        target: claim.target,
      }
    : { kind: 'link', id: link.id };
}

export function sameSelection(
  a: Selection | undefined,
  b: Selection | undefined
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.id !== b.id) {
    return false;
  }
  if (a.kind === 'link' && b.kind === 'link') {
    return (
      a.pair?.sourcePort === b.pair?.sourcePort &&
      a.pair?.targetPort === b.pair?.targetPort
    );
  }
  return true;
}
