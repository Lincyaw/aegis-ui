/**
 * Unit assertions for ``foldOps``. Same lightweight harness as
 * reduce.test.ts — node:assert + tiny shim so vitest can adopt the file
 * later without rewriting.
 */

import assert from 'node:assert/strict';

import { foldOps } from '../graphFold';

type Fn = () => void;
const CASES: Array<{ name: string; fn: Fn }> = [];
function it(name: string, fn: Fn): void {
  CASES.push({ name, fn });
}
function describe(_name: string, fn: () => void): void {
  fn();
}

describe('foldOps', () => {
  it('folds a six-op sequence into the expected event+edge set', () => {
    const ops: Array<Record<string, unknown>> = [
      {
        op: 'node_upsert',
        id: 1,
        kind: 'act',
        summary: 'agent calls bash',
        source_turns: [3],
      },
      {
        op: 'node_upsert',
        id: 2,
        kind: 'evid',
        summary: 'bash returns 0',
        source_turns: [4],
      },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'data',
        reason: 'bash result for call',
        cited_entities: ['bash'],
        cited_quote: '',
        src_turns: [3],
        dst_turns: [4],
      },
      {
        op: 'node_upsert',
        id: 3,
        kind: 'claim',
        summary: 'bash succeeded',
        source_turns: [4],
      },
      {
        op: 'edge_upsert',
        src: 2,
        dst: 3,
        kind: 'ref',
        reason: '',
        cited_entities: [],
        cited_quote: '',
        src_turns: [4],
        dst_turns: [4],
      },
      // delete the intermediate evid node — should cascade to BOTH edges.
      { op: 'node_delete', id: 2 },
    ];
    const folded = foldOps(ops);
    assert.equal(folded.events.length, 2);
    const ids = folded.events.map((e) => e.id).sort();
    assert.deepEqual(ids, [1, 3]);
    assert.equal(folded.edges.length, 0);
  });

  it('node_upsert replaces an earlier upsert by id', () => {
    const folded = foldOps([
      { op: 'node_upsert', id: 1, kind: 'act', summary: 'first', source_turns: [1] },
      { op: 'node_upsert', id: 1, kind: 'evid', summary: 'second', source_turns: [2] },
    ]);
    assert.equal(folded.events.length, 1);
    assert.equal(folded.events[0].kind, 'evid');
    assert.equal(folded.events[0].summary, 'second');
  });

  it('edge_upsert keyed by (src, dst, kind) — same triple replaces', () => {
    const folded = foldOps([
      { op: 'node_upsert', id: 1, kind: 'act', summary: 'a', source_turns: [] },
      { op: 'node_upsert', id: 2, kind: 'evid', summary: 'b', source_turns: [] },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'data',
        reason: 'r1',
        cited_entities: [],
        cited_quote: '',
        src_turns: [],
        dst_turns: [],
      },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'data',
        reason: 'r2',
        cited_entities: [],
        cited_quote: '',
        src_turns: [],
        dst_turns: [],
      },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'ref',
        reason: 'sibling',
        cited_entities: [],
        cited_quote: '',
        src_turns: [],
        dst_turns: [],
      },
    ]);
    assert.equal(folded.edges.length, 2);
    const dataEdge = folded.edges.find((e) => e.kind === 'data');
    assert.equal(dataEdge?.reason, 'r2');
  });

  it('edge_delete removes by (src, dst, kind) but leaves other kinds', () => {
    const folded = foldOps([
      { op: 'node_upsert', id: 1, kind: 'act', summary: 'a', source_turns: [] },
      { op: 'node_upsert', id: 2, kind: 'evid', summary: 'b', source_turns: [] },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'data',
        reason: '',
        cited_entities: [],
        cited_quote: '',
        src_turns: [],
        dst_turns: [],
      },
      {
        op: 'edge_upsert',
        src: 1,
        dst: 2,
        kind: 'ref',
        reason: '',
        cited_entities: [],
        cited_quote: '',
        src_turns: [],
        dst_turns: [],
      },
      { op: 'edge_delete', src: 1, dst: 2, kind: 'data' },
    ]);
    assert.equal(folded.edges.length, 1);
    assert.equal(folded.edges[0].kind, 'ref');
  });

  it('unknown op kinds are silently ignored', () => {
    const folded = foldOps([
      { op: 'node_upsert', id: 1, kind: 'act', summary: 'a', source_turns: [] },
      { op: 'who_knows', id: 1 },
    ]);
    assert.equal(folded.events.length, 1);
  });
});

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].endsWith('graphFold.test.ts');
if (isMain) {
  /* eslint-disable no-console */
  let failed = 0;
  for (const c of CASES) {
    try {
      c.fn();
      console.log(`ok  ${c.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${c.name}`);
      console.error(err);
    }
  }
  if (failed > 0) {
    process.exit(1);
  }
  /* eslint-enable no-console */
}
