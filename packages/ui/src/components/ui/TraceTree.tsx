import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Tooltip } from 'antd';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useResizable } from '../../hooks/useResizable';
import { breakAtSeparators } from '../../lib/breakAtSeparators';
import type { ChartColor } from '../../lib/chart';
import { formatDuration } from '../../lib/format';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { StatusDot } from './StatusDot';
import './TraceTree.css';
import { DefaultLink, type LinkComponent } from './linkComponent';
import { SelectedRowDetailContext } from './selectedRowDetail';
import { statusTone } from './traceStatus';

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
  /**
   * The span's category: a chip on the left of its `TraceTree` row, and,
   * without `color`, the colour of its `TimelineChart` bar (one per kind).
   */
  kind?: string;
  /**
   * The colour of its `TimelineChart` bar. Set it from a stable key when
   * `kind` is translated, so the colour does not follow the language.
   */
  color?: ChartColor;
  /** Drawn at the end of the span's `TimelineChart` bar. */
  badge?: ReactNode;
  /**
   * Drawn at the end of the span's name in its `TraceTree` row, e.g. a change
   * mark or a count. It is the row's accessible description, not part of its
   * name. Give a Chip in it `inverted` while the span is selected.
   */
  note?: ReactNode;
  /**
   * Draws the span's `TraceTree` row in muted ink, e.g. for a span that only
   * the trace it is compared with has.
   */
  muted?: boolean;
  /** The accessible name of the span's `TraceTree` row. Default: the row's text. */
  ariaLabel?: string;
  /**
   * Makes the span's name in its `TraceTree` row a link to this
   * destination. The row stays the tree's tab stop: the link is not a tab
   * stop, and Enter on the row follows it.
   */
  to?: string;
  /** Free-form attributes — only used by the inspector pane, not by the row itself. */
  attrs?: Record<string, unknown>;
}

interface TimedSpan extends TraceSpan {
  startMs: number;
  durationMs: number;
}

interface TraceTreeProps {
  /**
   * The spans in any order. A span whose `parentId` names no span is a root;
   * spans whose parents form a cycle are cut at one span of the cycle, which
   * becomes a root.
   */
  spans: TraceSpan[];
  /**
   * The selected span. Its row is revealed: when the tree mounts, and each
   * time `selectedId` changes, the rows it hangs under expand, so a tree
   * opened with `defaultCollapsedDepth` shows the path to it. Rows the
   * viewer collapses later stay collapsed.
   */
  selectedId?: string;
  onSelect?: (span: TraceSpan) => void;
  /**
   * Rows at this depth or deeper start collapsed when they have children.
   * Roots are depth 0, so `0` shows only the roots and `1` the roots and
   * their children. Applies to the spans present when the tree mounts.
   * Default: every row expanded.
   */
  defaultCollapsedDepth?: number;
  /** The tree's accessible name. Default: the locale's `traceSpans`. */
  ariaLabel?: string;
  /** Renders the names of spans with `to`. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
  style?: CSSProperties;
  surface?: TraceTreeSurface;
  nameColumnWidth?: number;
  defaultNameColumnWidth?: number;
  onNameColumnWidthChange?: (w: number) => void;
  persistKey?: string;
  /**
   * Wraps a long name over lines instead of truncating it: between words and
   * after `_ . - / :`, and inside a word only when it cannot fit a line. The
   * name keeps its runs of spaces, its tabs and its line breaks.
   */
  wrapName?: boolean;
}

interface Node {
  span: TraceSpan;
  parent: Node | null;
  children: Node[];
  depth: number;
}

interface VisibleRow {
  node: Node;
  /** 1-based position among its siblings. */
  position: number;
  siblings: number;
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
  spans.forEach((span) => {
    byId.set(span.id, { span, parent: null, children: [], depth: 0 });
  });
  const roots: Node[] = [];
  byId.forEach((node) => {
    const pid = node.span.parentId;
    const parent = pid ? byId.get(pid) : undefined;
    if (parent) {
      node.parent = parent;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const placed = new Set<Node>();
  const place = (node: Node, depth: number): void => {
    placed.add(node);
    node.depth = depth;
    node.children.forEach((child) => {
      place(child, depth + 1);
    });
  };
  roots.forEach((root) => {
    place(root, 0);
  });
  // A span no root reaches hangs below a cycle of parents. Climbing from it
  // comes back round to a span on the cycle, which becomes a root.
  byId.forEach((node) => {
    if (placed.has(node)) {
      return;
    }
    const climbed = new Set<Node>();
    let onCycle = node;
    while (onCycle.parent !== null && !climbed.has(onCycle)) {
      climbed.add(onCycle);
      onCycle = onCycle.parent;
    }
    const cut = onCycle;
    if (cut.parent !== null) {
      cut.parent.children = cut.parent.children.filter((c) => c !== cut);
      cut.parent = null;
    }
    roots.push(cut);
    place(cut, 0);
  });

  const sortRec = (n: Node): void => {
    sortByStart(n.children);
    n.children.forEach(sortRec);
  };
  sortByStart(roots);
  roots.forEach(sortRec);
  return roots;
}

function findNode(roots: Node[], id: string): Node | undefined {
  for (const root of roots) {
    if (root.span.id === id) {
      return root;
    }
    const found = findNode(root.children, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** `collapsed` without the ancestors of the row `id`, or `collapsed` itself when none of them is collapsed. */
function revealRow(
  roots: Node[],
  collapsed: Set<string>,
  id: string,
): Set<string> {
  let next = collapsed;
  for (
    let ancestor = findNode(roots, id)?.parent ?? null;
    ancestor !== null;
    ancestor = ancestor.parent
  ) {
    if (next.has(ancestor.span.id)) {
      if (next === collapsed) {
        next = new Set(collapsed);
      }
      next.delete(ancestor.span.id);
    }
  }
  return next;
}

function flatten(
  nodes: Node[],
  collapsed: Set<string>,
  out: VisibleRow[] = [],
): VisibleRow[] {
  nodes.forEach((node, index) => {
    out.push({ node, position: index + 1, siblings: nodes.length });
    if (!collapsed.has(node.span.id)) {
      flatten(node.children, collapsed, out);
    }
  });
  return out;
}

export function TraceTree({
  spans,
  selectedId,
  onSelect,
  defaultCollapsedDepth = Number.POSITIVE_INFINITY,
  ariaLabel,
  linkComponent: Link = DefaultLink,
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
  const treeRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, spans, 'tree', wrapRef);
  const strings = useStrings();
  const idPrefix = useId();
  const selection = useContext(SelectedRowDetailContext);
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
    return selectedId === undefined ? init : revealRow(roots, init, selectedId);
  });
  // The selection the tree last revealed, so a new selectedId is revealed
  // once, before it is painted, and a span that arrives later is revealed
  // when it arrives.
  const [revealed, setRevealed] = useState<string | undefined>(() =>
    selectedId !== undefined && findNode(roots, selectedId)
      ? selectedId
      : undefined,
  );
  if (selectedId === undefined && revealed !== undefined) {
    setRevealed(undefined);
  }
  if (
    selectedId !== undefined &&
    selectedId !== revealed &&
    findNode(roots, selectedId)
  ) {
    setRevealed(selectedId);
    const next = revealRow(roots, collapsed, selectedId);
    if (next !== collapsed) {
      setCollapsed(next);
    }
  }
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);

  const visible = useMemo(() => flatten(roots, collapsed), [roots, collapsed]);

  // One tab stop: the row last focused, else the selected row, else the first.
  const rowIndexOf = (id: string | undefined): number =>
    id === undefined ? -1 : visible.findIndex((r) => r.node.span.id === id);
  const focusedIndex = rowIndexOf(focusedId);
  const tabStopIndex =
    focusedIndex >= 0 ? focusedIndex : Math.max(rowIndexOf(selectedId), 0);

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

  const focusRow = (index: number): void => {
    if (index < 0 || index >= visible.length) {
      return;
    }
    setFocusedId(visible[index].node.span.id);
    const row = treeRef.current?.querySelectorAll<HTMLElement>(
      ':scope > [role="treeitem"]',
    )[index];
    row?.focus();
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
  ): void => {
    const { node } = visible[index];
    const expandable = node.children.length > 0;
    const expanded = expandable && !collapsed.has(node.span.id);
    switch (event.key) {
      case 'ArrowDown':
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        focusRow(index - 1);
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(visible.length - 1);
        break;
      case 'ArrowRight':
        if (expanded) {
          focusRow(index + 1);
        } else if (expandable) {
          toggle(node.span.id);
        }
        break;
      case 'ArrowLeft':
        if (expanded) {
          toggle(node.span.id);
        } else if (node.parent !== null) {
          const parent = node.parent;
          focusRow(visible.findIndex((r) => r.node === parent));
        }
        break;
      // The link's click reaches the row, which selects it too.
      case 'Enter':
        if (node.span.to !== undefined) {
          event.currentTarget
            .querySelector<HTMLElement>('.aegis-trace-tree__name a')
            ?.click();
        } else {
          onSelect?.(node.span);
        }
        break;
      case ' ':
        onSelect?.(node.span);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleRowClick = (event: MouseEvent<HTMLDivElement>, node: Node) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-trace-tree-caret]') !== null
    ) {
      toggle(node.span.id);
      return;
    }
    // A modified click opens the name's link elsewhere and leaves this
    // page's selection alone.
    if (
      (event.ctrlKey || event.metaKey || event.shiftKey) &&
      event.target instanceof Element &&
      event.target.closest('.aegis-trace-tree__name a') !== null
    ) {
      return;
    }
    onSelect?.(node.span);
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

  const rootStyle = {
    ...style,
    '--aegis-trace-tree-name-w': `${String(effectiveWidth)}px`,
  } as CSSProperties;

  return (
    <div ref={wrapRef} className={cls} style={rootStyle} {...agentAttrs}>
      <div
        ref={treeRef}
        className="aegis-trace-tree__rows"
        role="tree"
        aria-label={ariaLabel ?? strings.traceSpans}
      >
        {visible.map(({ node, position, siblings }, index) => {
          const span = node.span;
          const hasChildren = node.children.length > 0;
          const isCollapsed = collapsed.has(span.id);
          const isSelected = selectedId === span.id;
          const rowCls = [
            'aegis-trace-tree__row',
            span.muted ? 'aegis-trace-tree__row--muted' : '',
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
          const kind = span.kind ?? '';
          const meta = [timing, kind].filter(Boolean).join(' · ');
          const noteId = `${idPrefix}-note-${String(index)}`;
          const hasNote = span.note !== undefined && span.note !== null;
          const name = wrapName ? breakAtSeparators(span.name) : span.name;
          const tooltipContent = (
            <div className="aegis-trace-tree__tooltip">
              <div className="aegis-trace-tree__tooltip-name">{span.name}</div>
              {meta && (
                <div className="aegis-trace-tree__tooltip-meta">{meta}</div>
              )}
            </div>
          );

          return (
            <Fragment key={span.id}>
              <div
                ref={isSelected ? selection?.placeRow : undefined}
                className={rowCls}
                role="treeitem"
                aria-label={span.ariaLabel}
                aria-describedby={hasNote ? noteId : undefined}
                aria-level={node.depth + 1}
                aria-posinset={position}
                aria-setsize={siblings}
                aria-expanded={hasChildren ? !isCollapsed : undefined}
                aria-selected={isSelected ? true : undefined}
                tabIndex={index === tabStopIndex ? 0 : -1}
                onClick={(event) => {
                  handleRowClick(event, node);
                }}
                onKeyDown={(event) => {
                  handleRowKeyDown(event, index);
                }}
                onFocus={() => {
                  setFocusedId(span.id);
                }}
              >
                <div
                  className="aegis-trace-tree__label"
                  style={
                    {
                      '--depth': node.depth,
                    } as CSSProperties
                  }
                >
                  <span
                    className={
                      hasChildren
                        ? 'aegis-trace-tree__caret'
                        : 'aegis-trace-tree__caret aegis-trace-tree__caret--leaf'
                    }
                    aria-hidden="true"
                    data-trace-tree-caret={hasChildren ? '' : undefined}
                  >
                    {hasChildren ? (isCollapsed ? '▸' : '▾') : null}
                  </span>
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
                    <span className="aegis-trace-tree__name">
                      {span.to === undefined ? (
                        name
                      ) : (
                        <Link
                          to={span.to}
                          className="aegis-trace-tree__link"
                          tabIndex={-1}
                        >
                          {name}
                        </Link>
                      )}
                    </span>
                  </Tooltip>
                  {hasNote ? (
                    <span
                      id={noteId}
                      className="aegis-trace-tree__note"
                      aria-hidden="true"
                    >
                      {span.note}
                    </span>
                  ) : null}
                </div>
                {timed && (
                  <>
                    <span
                      className="aegis-trace-tree__gutter"
                      aria-hidden="true"
                    />
                    <div
                      className="aegis-trace-tree__bar-track"
                      aria-hidden="true"
                    >
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
                      {span.durationMs !== undefined &&
                        formatDuration(span.durationMs)}
                    </div>
                  </>
                )}
              </div>
              {isSelected ? selection?.inline : null}
            </Fragment>
          );
        })}
      </div>
      {timed && (
        <div
          {...handleProps}
          className="aegis-trace-tree__handle"
          aria-label={strings.resizeNameColumn}
        />
      )}
    </div>
  );
}
