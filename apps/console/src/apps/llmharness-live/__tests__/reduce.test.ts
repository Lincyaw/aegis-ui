/**
 * Unit assertions for the protocol reducer. Vitest is not yet wired
 * into this monorepo, so we use the lightweight ``node:assert`` API and
 * a tiny ``describe``/``it`` shim — the file is still runnable via
 * ``node --import tsx <path>`` when needed, and slots cleanly into
 * vitest once it lands (vitest exposes the same global ``describe`` /
 * ``it``, so the shim is overridden).
 */

import assert from 'node:assert/strict';

import {
  emptyState,
  type Frame,
  parseFrame,
  reduce,
  TIMELINE_CAP,
} from '../protocol';

type Fn = () => void;
const CASES: Array<{ name: string; fn: Fn }> = [];
function it(name: string, fn: Fn): void {
  CASES.push({ name, fn });
}
function describe(_name: string, fn: () => void): void {
  fn();
}

describe('reduce', () => {
  it('parseFrame: rejects non-JSON', () => {
    assert.equal(parseFrame('not json'), null);
    assert.equal(parseFrame('"not an object"'), null);
    assert.equal(parseFrame('{}'), null); // missing type
  });

  it('parseFrame: accepts known frames', () => {
    const f = parseFrame(
      JSON.stringify({ type: 'hello', root_session_id: 'r', schema_version: 1 }),
    );
    assert.ok(f);
    assert.equal(f.type, 'hello');
  });

  it('hello → state has root + isReplayingBacklog true', () => {
    const s1 = reduce(emptyState(), {
      type: 'hello',
      root_session_id: 'root-1',
      schema_version: 1,
    });
    assert.equal(s1.rootSessionId, 'root-1');
    assert.equal(s1.isReplayingBacklog, true);
    assert.equal(s1.schemaMismatch, false);
  });

  it('mismatched schema_version sets schemaMismatch', () => {
    const s = reduce(emptyState(), {
      type: 'hello',
      root_session_id: 'r',
      schema_version: 99,
    });
    assert.equal(s.schemaMismatch, true);
  });

  it('session_started + ended folds into sessions map', () => {
    const seq: Frame[] = [
      { type: 'hello', root_session_id: 'r', schema_version: 1 },
      {
        type: 'session_started',
        session_id: 'r',
        parent_session_id: null,
        purpose: 'root',
        cwd: '/tmp',
        ts: 1,
      },
      {
        type: 'session_started',
        session_id: 'c1',
        parent_session_id: 'r',
        purpose: 'cognitive_audit_extractor',
        cwd: '/tmp',
        ts: 2,
      },
      {
        type: 'session_started',
        session_id: 'c0',
        parent_session_id: 'r',
        purpose: 'cognitive_audit_extractor',
        cwd: '/tmp',
        ts: 1.5, // arrives later but started earlier
      },
      { type: 'session_ended', session_id: 'c1', ts: 5 },
    ];
    let s = emptyState();
    for (const f of seq) {
      s = reduce(s, f);
    }
    assert.equal(s.sessions.size, 3);
    assert.equal(s.sessions.get('c1')?.ended_ts, 5);
    assert.equal(s.sessions.get('r')?.ended_ts, null);
    // children ordered by started_ts ascending: c0 (1.5) before c1 (2)
    assert.deepEqual(s.childrenByParent.get('r'), ['c0', 'c1']);
    assert.deepEqual(s.childrenByParent.get(null), ['r']);
  });

  it('event + entry frames append to per-session timeline', () => {
    let s = emptyState();
    s = reduce(s, {
      type: 'session_started',
      session_id: 'a',
      parent_session_id: null,
      purpose: 'root',
      cwd: '/tmp',
      ts: 0,
    });
    s = reduce(s, {
      type: 'event',
      session_id: 'a',
      ts: 1,
      kind: 'TurnStartEvent',
      payload: {},
    });
    s = reduce(s, {
      type: 'entry',
      session_id: 'a',
      ts: 2,
      entry_type: 'message',
      payload: { role: 'assistant', content: [] },
    });
    const timeline = s.timelinesBySession.get('a') ?? [];
    assert.equal(timeline.length, 2);
    assert.equal(timeline[0].source, 'event');
    assert.equal(timeline[1].source, 'entry');
  });

  it('backlog_done flips isReplayingBacklog to false', () => {
    let s = emptyState();
    s = reduce(s, { type: 'hello', root_session_id: 'r', schema_version: 1 });
    s = reduce(s, { type: 'backlog_done' });
    assert.equal(s.isReplayingBacklog, false);
  });

  it('backlog frames preserve order before backlog_done; live frames follow', () => {
    let s = emptyState();
    const stream: Frame[] = [
      { type: 'hello', root_session_id: 'r', schema_version: 1 },
      {
        type: 'session_started',
        session_id: 'r',
        parent_session_id: null,
        purpose: 'root',
        cwd: '/tmp',
        ts: 0,
      },
      { type: 'event', session_id: 'r', ts: 1, kind: 'A', payload: {} },
      { type: 'event', session_id: 'r', ts: 2, kind: 'B', payload: {} },
      { type: 'backlog_done' },
      { type: 'event', session_id: 'r', ts: 3, kind: 'C', payload: {} },
    ];
    for (const f of stream) {
      s = reduce(s, f);
    }
    const t = s.timelinesBySession.get('r') ?? [];
    assert.deepEqual(t.map((x) => (x.source === 'event' ? x.kind : '?')), [
      'A',
      'B',
      'C',
    ]);
  });

  it('timeline is bounded at TIMELINE_CAP', () => {
    let s = emptyState();
    s = reduce(s, {
      type: 'session_started',
      session_id: 'b',
      parent_session_id: null,
      purpose: 'root',
      cwd: '/tmp',
      ts: 0,
    });
    for (let i = 0; i < TIMELINE_CAP + 10; i += 1) {
      s = reduce(s, {
        type: 'event',
        session_id: 'b',
        ts: i,
        kind: 'X',
        payload: { i },
      });
    }
    const t = s.timelinesBySession.get('b') ?? [];
    assert.equal(t.length, TIMELINE_CAP);
    assert.ok(s.truncatedSessions.has('b'));
    // First retained item should be the (TIMELINE_CAP + 10 - TIMELINE_CAP)=10th.
    assert.equal((t[0] as { ts: number }).ts, 10);
  });
});

// Run when invoked directly. Detection mirrors the common pattern.
const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].endsWith('reduce.test.ts');
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
