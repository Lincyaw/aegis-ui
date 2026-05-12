import { type ReactElement, useMemo, useState } from 'react';

import { Chip, MetricLabel, MonoValue, StatusDot } from '@OperationsPAI/aegis-ui';

import type { SpanRow } from '../api/clickhouse';
import { formatDurationMs } from '../conversation';
import './SessionsTree.css';

interface SessionNode {
  span: SpanRow;
  sid: string;
  children: SessionNode[];
  depth: number;
}

interface SessionsTreeProps {
  spans: SpanRow[];
  selectedSessionId: string;
  onSelect: (sessionId: string) => void;
}

function buildSessionForest(spans: SpanRow[]): SessionNode[] {
  const sessionSpans = spans.filter((s) => s.name === 'agentm.session');
  if (sessionSpans.length === 0) {
    return [];
  }
  const bySid = new Map<string, SessionNode>();
  for (const s of sessionSpans) {
    const sid = s.attributes['agentm.session_id'] ?? '';
    if (sid) {
      bySid.set(sid, { span: s, sid, children: [], depth: 0 });
    }
  }
  const roots: SessionNode[] = [];
  bySid.forEach((node) => {
    const pid = node.span.attributes['agentm.parent_session_id'] ?? '';
    const parent = pid ? bySid.get(pid) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (n: SessionNode): void => {
    n.children.sort(
      (a, b) =>
        new Date(a.span.timestamp).getTime() -
        new Date(b.span.timestamp).getTime(),
    );
    n.children.forEach(sortRec);
  };
  roots.forEach(sortRec);
  roots.sort(
    (a, b) =>
      new Date(a.span.timestamp).getTime() -
      new Date(b.span.timestamp).getTime(),
  );
  return roots;
}

function flatten(roots: SessionNode[], collapsed: Set<string>): SessionNode[] {
  const out: SessionNode[] = [];
  const walk = (n: SessionNode): void => {
    out.push(n);
    if (!collapsed.has(n.sid)) {
      n.children.forEach(walk);
    }
  };
  roots.forEach(walk);
  return out;
}

function rolePill(span: SpanRow): string {
  const purpose = span.attributes['agentm.purpose'];
  if (purpose) {
    return purpose;
  }
  const pid = span.attributes['agentm.parent_session_id'] ?? '';
  return pid ? 'child' : 'orchestrator';
}

function turnCount(span: SpanRow, allSpans: SpanRow[]): number {
  const sid = span.spanId;
  return allSpans.filter(
    (s) => s.name === 'agentm.turn' && s.parentSpanId === sid,
  ).length;
}

export function SessionsTree({
  spans,
  selectedSessionId,
  onSelect,
}: SessionsTreeProps): ReactElement {
  const roots = useMemo(() => buildSessionForest(spans), [spans]);
  // Default: collapse anything beyond depth 1 so a 20-session tree
  // doesn't flood the pane on first render.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const init = new Set<string>();
    const walk = (n: SessionNode): void => {
      if (n.depth >= 1 && n.children.length > 0) {
        init.add(n.sid);
      }
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    return init;
  });

  const visible = useMemo(() => flatten(roots, collapsed), [roots, collapsed]);
  const allCount = useMemo(
    () => spans.filter((s) => s.name === 'agentm.session').length,
    [spans],
  );

  const toggle = (sid: string): void => {
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.add(sid);
      }
      return next;
    });
  };

  if (visible.length === 0) {
    return (
      <div className='aegis-sessions-tree__empty'>
        <MetricLabel size='xs'>no sessions</MetricLabel>
      </div>
    );
  }

  return (
    <div className='aegis-sessions-tree' role='tree'>
      <button
        type='button'
        className={`aegis-sessions-tree__row aegis-sessions-tree__row--all${
          selectedSessionId === '' ? ' aegis-sessions-tree__row--selected' : ''
        }`}
        onClick={() => onSelect('')}
      >
        <span className='aegis-sessions-tree__caret aegis-sessions-tree__caret--leaf' />
        <span className='aegis-sessions-tree__name'>All sessions</span>
        <MetricLabel size='xs'>{allCount}</MetricLabel>
      </button>
      {visible.map((n) => {
        const selected = n.sid === selectedSessionId;
        const isError = n.span.statusCode === 'STATUS_CODE_ERROR';
        const hasChildren = n.children.length > 0;
        const isCollapsed = collapsed.has(n.sid);
        return (
          <div
            key={n.span.spanId}
            className={`aegis-sessions-tree__row${
              selected ? ' aegis-sessions-tree__row--selected' : ''
            }${isError ? ' aegis-sessions-tree__row--error' : ''}`}
            style={{ paddingLeft: `calc(${n.depth.toString()} * 12px + 4px)` }}
            role='treeitem'
            aria-selected={selected}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
          >
            {hasChildren ? (
              <button
                type='button'
                className='aegis-sessions-tree__caret'
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                onClick={() => toggle(n.sid)}
              >
                {isCollapsed ? '▸' : '▾'}
              </button>
            ) : (
              <span className='aegis-sessions-tree__caret aegis-sessions-tree__caret--leaf' />
            )}
            <button
              type='button'
              className='aegis-sessions-tree__main'
              onClick={() => onSelect(n.sid)}
              title={n.sid}
            >
              <StatusDot tone={isError ? 'warning' : 'ink'} size={6} />
              <Chip tone='ghost' className='aegis-sessions-tree__role'>
                {rolePill(n.span)}
              </Chip>
              <span className='aegis-sessions-tree__name'>
                {n.sid.slice(0, 12)}
              </span>
              <MonoValue size='sm' className='aegis-sessions-tree__dur'>
                {formatDurationMs(n.span.durationNs / 1_000_000)}
              </MonoValue>
              <MetricLabel size='xs'>{turnCount(n.span, spans)}t</MetricLabel>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default SessionsTree;
