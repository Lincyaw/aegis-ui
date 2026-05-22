/**
 * Fold a stream of ``llmharness.audit_graph_op`` payloads into the
 * ``ExtractorEvent[] + GraphEdge[]`` shape that ``EventGraphView``
 * (originally written for the review sub-app) renders.
 *
 * Op shapes are produced by ``llmharness/audit/graph_ops.py``:
 *   - node_upsert: { op, id, kind, summary, source_turns, external_refs? }
 *   - node_delete: { op, id }
 *   - edge_upsert: { op, src, dst, kind, reason, cited_entities, cited_quote,
 *                    src_turns, dst_turns }
 *   - edge_delete: { op, src, dst, kind }
 *
 * Semantics:
 *   - node_upsert replaces by id (full row swap)
 *   - node_delete cascades — every edge touching the deleted node is removed
 *   - edge_upsert keys by (src, dst, kind) — same triple replaces
 *   - edge_delete removes by the same triple
 *
 * We deliberately keep the output types compatible with
 * ``llmharness-review/schemas.ts`` (ExtractorEvent / GraphEdge) without
 * importing from there — the brief forbids reaching into the peer
 * sub-app. The local re-declaration is one-way "lookup" only.
 */

export interface FoldedEvent {
  id: number;
  kind: string;
  summary: string;
  source_turns: number[];
}

export interface FoldedEdge {
  src: number;
  dst: number;
  kind: string;
  reason?: string;
  cited_entities?: string[];
  src_turns?: number[];
  dst_turns?: number[];
}

export interface FoldedGraph {
  events: FoldedEvent[];
  edges: FoldedEdge[];
}

function edgeKey(src: number, dst: number, kind: string): string {
  return `${src.toString()}->${dst.toString()}::${kind}`;
}

function toIntArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((v) => String(v));
}

export function foldOps(ops: ReadonlyArray<Record<string, unknown>>): FoldedGraph {
  const nodes = new Map<number, FoldedEvent>();
  const edges = new Map<string, FoldedEdge>();

  for (const op of ops) {
    const kind = op.op;
    if (kind === 'node_upsert') {
      const id = Number(op.id);
      if (!Number.isFinite(id)) {
        continue;
      }
      nodes.set(id, {
        id,
        kind: String(op.kind ?? ''),
        summary: String(op.summary ?? ''),
        source_turns: toIntArray(op.source_turns),
      });
    } else if (kind === 'node_delete') {
      const id = Number(op.id);
      if (!Number.isFinite(id)) {
        continue;
      }
      nodes.delete(id);
      // Cascade: drop every edge touching this node.
      for (const k of Array.from(edges.keys())) {
        const e = edges.get(k);
        if (e && (e.src === id || e.dst === id)) {
          edges.delete(k);
        }
      }
    } else if (kind === 'edge_upsert') {
      const src = Number(op.src);
      const dst = Number(op.dst);
      const ek = String(op.kind ?? '');
      if (!Number.isFinite(src) || !Number.isFinite(dst) || !ek) {
        continue;
      }
      const key = edgeKey(src, dst, ek);
      edges.set(key, {
        src,
        dst,
        kind: ek,
        reason: typeof op.reason === 'string' ? op.reason : undefined,
        cited_entities: toStringArray(op.cited_entities),
        src_turns: toIntArray(op.src_turns),
        dst_turns: toIntArray(op.dst_turns),
      });
    } else if (kind === 'edge_delete') {
      const src = Number(op.src);
      const dst = Number(op.dst);
      const ek = String(op.kind ?? '');
      if (!Number.isFinite(src) || !Number.isFinite(dst) || !ek) {
        continue;
      }
      edges.delete(edgeKey(src, dst, ek));
    }
    // Unknown op kinds are skipped — protocol additions don't break us.
  }

  return {
    events: Array.from(nodes.values()).sort((a, b) => a.id - b.id),
    edges: Array.from(edges.values()),
  };
}
