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

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { useResizable } from '../../hooks/useResizable';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { MonoValue } from './MonoValue';
import { StatusDot } from './StatusDot';
import './TraceTree.css';
import { formatDuration, nodeToString, statusTone } from './traceFormat';

export type TraceTreeSurface = PrimitiveSurface<TraceSpan[]>;

export interface TraceSpan {
  id: string;
  parentId?: string | null;
  name: string;
  /**
   * Milliseconds since trace start. Leave `startMs` and `durationMs` out for a
   * span whose time is not recorded: its row draws no bar, and siblings that are
   * not all timed keep the order they are given in.
   */
  startMs?: number;
  durationMs?: number;
  status?: 'ok' | 'error' | 'unset';
  /** Short label rendered as a chip on the left of the row. */
  kind?: ReactNode;
  /** Free-form attributes — only used by the inspector pane, not by the row itself. */
  attrs?: Record<string, unknown>;
}

interface TimedSpan extends TraceSpan {
  startMs: number;
  durationMs: number;
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

function isTimed(span: TraceSpan): span is TimedSpan {
  return span.startMs !== undefined && span.durationMs !== undefined;
}

function sortByStart(nodes: Node[]): void {
  if (nodes.every((n) => n.span.startMs !== undefined)) {
    nodes.sort((a, b) => (a.span.startMs ?? 0) - (b.span.startMs ?? 0));
  }
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
    sortByStart(n.children);
    n.children.forEach(sortRec);
  };
  sortByStart(roots);
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
  const agentAttrs = usePrimitiveSurface(surface, spans, 'tree', wrapRef);
  const strings = useStrings();
  const { roots, traceDuration, traceStart, timed } = useMemo(() => {
    const r = buildForest(spans);
    const timedSpans = spans.filter(isTimed);
    const start = timedSpans.length
      ? Math.min(...timedSpans.map((s) => s.startMs))
      : 0;
    const end = timedSpans.length
      ? Math.max(...timedSpans.map((s) => s.startMs + s.durationMs))
      : 1;
    return {
      roots: r,
      traceStart: start,
      traceDuration: Math.max(end - start, 1),
      timed: timedSpans.length > 0,
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
    timed ? '' : 'aegis-trace-tree--untimed',
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
      {...agentAttrs}
    >
      {visible.map((n) => {
        const isCollapsed = collapsed.has(n.span.id);
        const hasChildren = n.children.length > 0;
        const isSelected = selectedId === n.span.id;
        const span = n.span;
        const handleClick = (): void => onSelect?.(span);
        const handleKey = (e: KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(span);
          }
        };
        const rowCls = [
          'aegis-trace-tree__row',
          isSelected ? 'aegis-trace-tree__row--selected' : '',
          span.status === 'error' ? 'aegis-trace-tree__row--error' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const timing = isTimed(span)
          ? strings.traceSpanTiming(
              formatDuration(span.startMs - traceStart),
              formatDuration(span.durationMs),
            )
          : '';
        const kind = span.kind ? nodeToString(span.kind) : '';
        const meta = [timing, kind].filter(Boolean).join(' · ');
        const tooltipContent = (
          <div className="aegis-trace-tree__tooltip">
            <div className="aegis-trace-tree__tooltip-name">{span.name}</div>
            {meta && (
              <div className="aegis-trace-tree__tooltip-meta">{meta}</div>
            )}
          </div>
        );

        return (
          <div
            key={span.id}
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
                  aria-label={
                    isCollapsed ? strings.expandRow : strings.collapseRow
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(span.id);
                  }}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span className="aegis-trace-tree__caret aegis-trace-tree__caret--leaf" />
              )}
              <StatusDot tone={statusTone(span.status)} size={6} />
              {span.kind ? (
                <Chip tone="ghost" className="aegis-trace-tree__kind">
                  {span.kind}
                </Chip>
              ) : null}
              <Tooltip
                placement="topLeft"
                mouseEnterDelay={0.3}
                styles={{ root: { maxWidth: 'var(--tooltip-max-width)' } }}
                title={tooltipContent}
              >
                <span className="aegis-trace-tree__name">{span.name}</span>
              </Tooltip>
            </div>
            {timed && (
              <>
                <div
                  {...handleProps}
                  className="aegis-trace-tree__handle"
                  aria-label={strings.resizeNameColumn}
                />
                <div className="aegis-trace-tree__bar-track" aria-hidden="true">
                  {isTimed(span) && (
                    <span
                      className="aegis-trace-tree__bar"
                      style={{
                        left: `${(((span.startMs - traceStart) / traceDuration) * 100).toString()}%`,
                        width: `${Math.max((span.durationMs / traceDuration) * 100, 0.5).toString()}%`,
                      }}
                    />
                  )}
                </div>
                <div className="aegis-trace-tree__duration">
                  {span.durationMs !== undefined && (
                    <MonoValue size="sm" weight="regular">
                      {formatDuration(span.durationMs)}
                    </MonoValue>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
