import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import { Chip } from './Chip';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';
import './TraceTree.css';

export interface TraceTreeSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (spans: TraceSpan[]) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

export interface TraceSpan {
  id: string;
  parentId?: string | null;
  name: string;
  /** Milliseconds since trace start. */
  startMs: number;
  durationMs: number;
  status?: 'ok' | 'error' | 'unset';
  /** Short label rendered as a chip on the left of the row. */
  kind?: ReactNode;
  /** Free-form attributes — only used by the inspector pane, not by the row itself. */
  attrs?: Record<string, unknown>;
}

interface TraceTreeProps {
  spans: TraceSpan[];
  selectedId?: string;
  onSelect?: (span: TraceSpan) => void;
  /** Collapse rows with this many descendants or more by default. */
  defaultCollapsedDepth?: number;
  className?: string;
  style?: CSSProperties;
  surface?: TraceTreeSurface;
}

interface Node {
  span: TraceSpan;
  children: Node[];
  depth: number;
}

function buildForest(spans: TraceSpan[]): Node[] {
  const byId = new Map<string, Node>();
  spans.forEach((s) => {
    byId.set(s.id, { span: s, children: [], depth: 0 });
  });
  const roots: Node[] = [];
  byId.forEach((node) => {
    const pid = node.span.parentId;
    const parent = pid ? byId.get(pid) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (n: Node): void => {
    n.children.sort((a, b) => a.span.startMs - b.span.startMs);
    n.children.forEach(sortRec);
  };
  roots.sort((a, b) => a.span.startMs - b.span.startMs);
  roots.forEach(sortRec);
  return roots;
}

function flatten(
  nodes: Node[],
  collapsed: Set<string>,
  out: Node[] = [],
): Node[] {
  nodes.forEach((n) => {
    out.push(n);
    if (!collapsed.has(n.span.id)) {
      flatten(n.children, collapsed, out);
    }
  });
  return out;
}

function statusTone(status?: TraceSpan['status']): 'warning' | 'ink' | 'muted' {
  if (status === 'error') {
    return 'warning';
  }
  if (status === 'ok') {
    return 'ink';
  }
  return 'muted';
}

export function TraceTree({
  spans,
  selectedId,
  onSelect,
  defaultCollapsedDepth = 99,
  className,
  style,
  surface,
}: TraceTreeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<TraceSpan[]>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'tree',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: spans,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const { roots, traceDuration, traceStart } = useMemo(() => {
    const r = buildForest(spans);
    const start = spans.length ? Math.min(...spans.map((s) => s.startMs)) : 0;
    const end = spans.length
      ? Math.max(...spans.map((s) => s.startMs + s.durationMs))
      : 1;
    return {
      roots: r,
      traceStart: start,
      traceDuration: Math.max(end - start, 1),
    };
  }, [spans]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const init = new Set<string>();
    const walk = (n: Node): void => {
      if (n.depth >= defaultCollapsedDepth && n.children.length > 0) {
        init.add(n.span.id);
      }
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    return init;
  });

  const visible = useMemo(() => flatten(roots, collapsed), [roots, collapsed]);

  const toggle = (id: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const cls = ['aegis-trace-tree', className ?? ''].filter(Boolean).join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      style={style}
      role="tree"
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {visible.map((n) => {
        const isCollapsed = collapsed.has(n.span.id);
        const hasChildren = n.children.length > 0;
        const isSelected = selectedId === n.span.id;
        const offsetPct = ((n.span.startMs - traceStart) / traceDuration) * 100;
        const widthPct = Math.max(
          (n.span.durationMs / traceDuration) * 100,
          0.5,
        );
        const handleClick = (): void => onSelect?.(n.span);
        const handleKey = (e: KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(n.span);
          }
        };
        const rowCls = [
          'aegis-trace-tree__row',
          isSelected ? 'aegis-trace-tree__row--selected' : '',
          n.span.status === 'error' ? 'aegis-trace-tree__row--error' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={n.span.id}
            className={rowCls}
            role="treeitem"
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            aria-selected={isSelected}
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKey}
          >
            <div
              className="aegis-trace-tree__label"
              style={
                {
                  '--depth': n.depth,
                } as CSSProperties
              }
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="aegis-trace-tree__caret"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(n.span.id);
                  }}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span className="aegis-trace-tree__caret aegis-trace-tree__caret--leaf" />
              )}
              <StatusDot tone={statusTone(n.span.status)} size={6} />
              {n.span.kind ? (
                <Chip tone="ghost" className="aegis-trace-tree__kind">
                  {n.span.kind}
                </Chip>
              ) : null}
              <span className="aegis-trace-tree__name" title={n.span.name}>
                {n.span.name}
              </span>
            </div>
            <div className="aegis-trace-tree__bar-track" aria-hidden="true">
              <span
                className="aegis-trace-tree__bar"
                style={{
                  left: `${offsetPct.toString()}%`,
                  width: `${widthPct.toString()}%`,
                }}
              />
            </div>
            <div className="aegis-trace-tree__duration">
              <MonoValue size="sm" weight="regular">
                {formatDuration(n.span.durationMs)}
              </MonoValue>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export default TraceTree;
