import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Tooltip } from 'antd';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import { useResizable } from '../../hooks/useResizable';
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
  nameColumnWidth?: number;
  defaultNameColumnWidth?: number;
  onNameColumnWidthChange?: (w: number) => void;
  persistKey?: string;
  wrapName?: boolean;
}

interface Node {
  span: TraceSpan;
  children: Node[];
  depth: number;
}

const NAME_COL_MIN = 180;
const NAME_COL_MAX = 700;
const NAME_COL_DEFAULT = 320;

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
  nameColumnWidth,
  defaultNameColumnWidth = NAME_COL_DEFAULT,
  onNameColumnWidthChange,
  persistKey,
  wrapName = false,
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

  const resizePersistKey =
    persistKey !== undefined
      ? `aegis-trace-tree-name-w:${persistKey}`
      : undefined;

  const {
    width: internalWidth,
    handleProps,
    isDragging,
  } = useResizable({
    initialWidth: defaultNameColumnWidth,
    minWidth: NAME_COL_MIN,
    maxWidth: NAME_COL_MAX,
    side: 'left',
    persistKey: resizePersistKey,
  });

  const effectiveWidth = nameColumnWidth ?? internalWidth;

  useEffect(() => {
    if (nameColumnWidth === undefined) {
      onNameColumnWidthChange?.(internalWidth);
    }
  }, [internalWidth, nameColumnWidth, onNameColumnWidthChange]);

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

  const cls = [
    'aegis-trace-tree',
    isDragging ? 'aegis-trace-tree--dragging' : '',
    wrapName ? 'aegis-trace-tree--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const rowStyle = {
    '--aegis-trace-tree-name-w': `${String(effectiveWidth)}px`,
  } as CSSProperties;

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

        const tooltipContent = (
          <div className="aegis-trace-tree__tooltip">
            <div className="aegis-trace-tree__tooltip-name">{n.span.name}</div>
            <div className="aegis-trace-tree__tooltip-meta">
              {`start +${formatDuration(n.span.startMs - traceStart)} · dur ${formatDuration(n.span.durationMs)}`}
              {n.span.kind ? ` · ${nodeToString(n.span.kind)}` : ''}
            </div>
          </div>
        );

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
            style={rowStyle}
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
              <Tooltip
                placement="topLeft"
                mouseEnterDelay={0.3}
                overlayStyle={{ maxWidth: 480 }}
                title={tooltipContent}
              >
                <span className="aegis-trace-tree__name">{n.span.name}</span>
              </Tooltip>
            </div>
            <div
              {...handleProps}
              className="aegis-trace-tree__handle"
              aria-label="Resize name column"
            />
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

function nodeToString(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  return '';
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
