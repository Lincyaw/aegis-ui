import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  ContentInspectorDialog,
  EmptyState,
  ErrorState,
  type InspectableContent,
  MetricLabel,
  MonoValue,
  SessionRunOutputView,
  SessionRunTrajectoryView,
} from '@lincyaw/aegis-ui';

import {
  getSessionRow,
  listMessagesBySession,
  listSessionRows,
  listToolsBySession,
  type SessionRow,
} from '../api/clickhouse';
import { useCompareList } from '../compareList';
import {
  lineageLabel,
  parentKey,
  type SessionDataState,
  toSessionRunFacts,
  toSessionRunMessages,
  toSessionRunSubmission,
  toSessionRunSummary,
  toSessionRunTools,
} from '../sessionRunAdapters';

import './SessionDetail.css';

const TREE_SINCE_HOURS = 720;
const MAX_TREE_INDENT_DEPTH = 4;
const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 420;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 560;
const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 620;
const MIN_CENTER_WIDTH = 420;
const SPLITTER_TOTAL_WIDTH = 16;
const PANE_KEYBOARD_STEP = 24;

interface SessionTreeNode {
  row: SessionRow;
  children: SessionTreeNode[];
  depth: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: SessionRow[] };

type ResizeEdge = 'left' | 'right';

interface PaneWidths {
  left: number;
  right: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function constrainPaneWidths(
  widths: PaneWidths,
  containerWidth: number,
  activeEdge: ResizeEdge,
): PaneWidths {
  if (containerWidth <= 0) {
    return widths;
  }
  const available = containerWidth - SPLITTER_TOTAL_WIDTH;
  const leftMaxByCenter = Math.max(
    MIN_LEFT_WIDTH,
    available - MIN_CENTER_WIDTH - MIN_RIGHT_WIDTH,
  );
  const rightMaxByCenter = Math.max(
    MIN_RIGHT_WIDTH,
    available - MIN_CENTER_WIDTH - MIN_LEFT_WIDTH,
  );
  let left = clamp(widths.left, MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, leftMaxByCenter));
  let right = clamp(
    widths.right,
    MIN_RIGHT_WIDTH,
    Math.min(MAX_RIGHT_WIDTH, rightMaxByCenter),
  );
  const center = available - left - right;
  if (center < MIN_CENTER_WIDTH) {
    if (activeEdge === 'left') {
      left = Math.max(MIN_LEFT_WIDTH, available - MIN_CENTER_WIDTH - right);
    } else {
      right = Math.max(MIN_RIGHT_WIDTH, available - MIN_CENTER_WIDTH - left);
    }
  }
  return { left, right };
}

function buildTree(rows: SessionRow[], selectedId: string): SessionTreeNode[] {
  const byId = new Map(rows.map((row) => [row.sessionId, row]));
  const selected = byId.get(selectedId);
  if (!selected) {
    return [];
  }
  let root = selected;
  const seen = new Set<string>();
  while (parentKey(root) && byId.has(parentKey(root)) && !seen.has(root.sessionId)) {
    seen.add(root.sessionId);
    root = byId.get(parentKey(root)) ?? root;
  }

  const childrenByParent = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const parent = parentKey(row);
    if (!parent) {
      continue;
    }
    const list = childrenByParent.get(parent) ?? [];
    list.push(row);
    childrenByParent.set(parent, list);
  }
  childrenByParent.forEach((list) => {
    list.sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
  });

  const walk = (row: SessionRow, depth: number): SessionTreeNode => ({
    row,
    depth,
    children: (childrenByParent.get(row.sessionId) ?? []).map((child) =>
      walk(child, depth + 1),
    ),
  });
  return [walk(root, 0)];
}

function flattenTree(nodes: SessionTreeNode[]): SessionTreeNode[] {
  const out: SessionTreeNode[] = [];
  const walk = (node: SessionTreeNode): void => {
    out.push(node);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function mergeSessionRows(rows: SessionRow[], required: SessionRow | null): SessionRow[] {
  if (!required || rows.some((row) => row.sessionId === required.sessionId)) {
    return rows;
  }
  return [required, ...rows];
}

export function SessionDetail(): ReactElement {
  const { rootSessionId } = useParams<{ rootSessionId: string }>();
  const sessionId = rootSessionId ?? '';
  const { pinned, toggle } = useCompareList();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [paneWidths, setPaneWidths] = useState<PaneWidths>({
    left: DEFAULT_LEFT_WIDTH,
    right: DEFAULT_RIGHT_WIDTH,
  });
  const [treeLoad, setTreeLoad] = useState<LoadState>({ kind: 'loading' });
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId);
  const [sessionData, setSessionData] = useState<SessionDataState>({
    kind: 'idle',
  });
  const [inspectedContent, setInspectedContent] =
    useState<InspectableContent | null>(null);

  useEffect(() => {
    setSelectedSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let cancelled = false;
    setTreeLoad({ kind: 'loading' });
    Promise.all([
      listSessionRows({ sinceHours: TREE_SINCE_HOURS, limit: 5000 }),
      getSessionRow(sessionId),
    ])
      .then(([rows, requiredRow]) => {
        if (!cancelled) {
          setTreeLoad({ kind: 'ready', rows: mergeSessionRows(rows, requiredRow) });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTreeLoad({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }
    let cancelled = false;
    setSessionData({ kind: 'loading' });
    Promise.all([
      listMessagesBySession(selectedSessionId),
      listToolsBySession(selectedSessionId),
    ])
      .then(([messages, tools]) => {
        if (!cancelled) {
          setSessionData({ kind: 'ready', messages, tools });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSessionData({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  const rows = useMemo(
    () => (treeLoad.kind === 'ready' ? treeLoad.rows : []),
    [treeLoad],
  );
  const selectedRow = rows.find((row) => row.sessionId === selectedSessionId);
  const tree = useMemo(
    () => buildTree(rows, selectedSessionId || sessionId),
    [rows, selectedSessionId, sessionId],
  );
  const visibleTree = useMemo(() => flattenTree(tree), [tree]);
  const pinSessionId = selectedRow?.sessionId || selectedSessionId;
  const isPinned = pinSessionId ? pinned.includes(pinSessionId) : false;
  const layoutStyle = {
    '--session-tree-left-width': `${paneWidths.left.toString()}px`,
    '--session-tree-right-width': `${paneWidths.right.toString()}px`,
  } as CSSProperties;

  const resizePane = (edge: ResizeEdge, clientX: number): void => {
    const rect = layoutRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPaneWidths((current) => {
      const next =
        edge === 'left'
          ? { ...current, left: clientX - rect.left }
          : { ...current, right: rect.right - clientX };
      return constrainPaneWidths(next, rect.width, edge);
    });
  };

  const startPaneResize = (
    edge: ResizeEdge,
    event: PointerEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    resizePane(edge, event.clientX);
    document.body.classList.add('session-tree-page--resizing');
    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      resizePane(edge, moveEvent.clientX);
    };
    const stopResize = (): void => {
      document.body.classList.remove('session-tree-page--resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  const nudgePane = (edge: ResizeEdge, delta: number): void => {
    const width = layoutRef.current?.getBoundingClientRect().width ?? 0;
    setPaneWidths((current) => {
      const next =
        edge === 'left'
          ? { ...current, left: current.left + delta }
          : { ...current, right: current.right - delta };
      return constrainPaneWidths(next, width, edge);
    });
  };

  const handleSplitterKeyDown = (
    edge: ResizeEdge,
    event: KeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgePane(edge, -PANE_KEYBOARD_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgePane(edge, PANE_KEYBOARD_STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const width = layoutRef.current?.getBoundingClientRect().width ?? 0;
      setPaneWidths((current) =>
        constrainPaneWidths(
          {
            ...current,
            [edge]: edge === 'left' ? MIN_LEFT_WIDTH : MAX_RIGHT_WIDTH,
          },
          width,
          edge,
        ),
      );
    } else if (event.key === 'End') {
      event.preventDefault();
      const width = layoutRef.current?.getBoundingClientRect().width ?? 0;
      setPaneWidths((current) =>
        constrainPaneWidths(
          {
            ...current,
            [edge]: edge === 'left' ? MAX_LEFT_WIDTH : MIN_RIGHT_WIDTH,
          },
          width,
          edge,
        ),
      );
    }
  };

  const resetPaneWidths = (): void => {
    setPaneWidths({ left: DEFAULT_LEFT_WIDTH, right: DEFAULT_RIGHT_WIDTH });
  };

  if (!sessionId) {
    return <ErrorState title='Missing session id' />;
  }

  return (
    <div className='trajectories-detail'>
      <header className='session-tree-page__masthead'>
        <Link to='..' className='session-tree-page__back'>
          ← Sessions
        </Link>
        <div className='session-tree-page__header-extra'>
          <MonoValue size='sm'>{sessionId.slice(0, 16)}…</MonoValue>
          {pinSessionId && (
            <Chip
              tone={isPinned ? 'ink' : 'default'}
              onClick={() => toggle(pinSessionId)}
            >
              {isPinned ? '★ pinned session' : '☆ pin session'}
            </Chip>
          )}
          {pinned.length === 2 && (
            <Link to='/trajectories/compare'>
              <Chip tone='warning'>compare 2 →</Chip>
            </Link>
          )}
          <MetricLabel>{pinned.length}/2 pinned</MetricLabel>
        </div>
      </header>

      {treeLoad.kind === 'error' && (
        <ErrorState
          title='Failed to load session tree'
          description={treeLoad.message}
        />
      )}
      {treeLoad.kind === 'loading' && <EmptyState title='Loading session tree…' />}
      {treeLoad.kind === 'ready' && !selectedRow && (
        <ErrorState
          title='Session not found'
          description='Try widening the session table time range, or verify the session id exists in ClickHouse.'
        />
      )}
      {treeLoad.kind === 'ready' && selectedRow && (
        <div
          ref={layoutRef}
          className='session-tree-page'
          style={layoutStyle}
        >
          <aside className='session-tree-page__tree'>
            <header className='session-tree-page__pane-head'>
              Session tree
              <MetricLabel size='xs'>{visibleTree.length}</MetricLabel>
            </header>
            <SessionTreeList
              nodes={visibleTree}
              selectedSessionId={selectedSessionId}
              onSelect={setSelectedSessionId}
            />
          </aside>
          <PaneSplitter
            edge='left'
            label='Resize session tree pane'
            onPointerDown={startPaneResize}
            onKeyDown={handleSplitterKeyDown}
            onDoubleClick={resetPaneWidths}
          />
          <main className='session-tree-page__trajectory'>
            <header className='session-tree-page__pane-head'>
              Trajectory
              <MetricLabel size='xs'>{selectedSessionId.slice(0, 12)}</MetricLabel>
            </header>
            <TrajectoryPane
              row={selectedRow}
              state={sessionData}
              forkMessageId={selectedRow.forkMessageId}
              onInspectContent={setInspectedContent}
            />
          </main>
          <PaneSplitter
            edge='right'
            label='Resize output pane'
            onPointerDown={startPaneResize}
            onKeyDown={handleSplitterKeyDown}
            onDoubleClick={resetPaneWidths}
          />
          <aside className='session-tree-page__output'>
            <header className='session-tree-page__pane-head'>Output</header>
            <OutputPane
              row={selectedRow}
              state={sessionData}
              onInspectContent={setInspectedContent}
            />
          </aside>
        </div>
      )}
      <ContentInspectorDialog
        open={inspectedContent !== null}
        content={inspectedContent}
        onClose={() => setInspectedContent(null)}
      />
    </div>
  );
}

function PaneSplitter({
  edge,
  label,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
}: {
  edge: ResizeEdge;
  label: string;
  onPointerDown: (
    edge: ResizeEdge,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onKeyDown: (
    edge: ResizeEdge,
    event: KeyboardEvent<HTMLButtonElement>,
  ) => void;
  onDoubleClick: () => void;
}): ReactElement {
  return (
    <button
      type='button'
      className={`session-tree-page__splitter session-tree-page__splitter--${edge}`}
      aria-label={label}
      aria-orientation='vertical'
      role='separator'
      onPointerDown={(event) => onPointerDown(edge, event)}
      onKeyDown={(event) => onKeyDown(edge, event)}
      onDoubleClick={onDoubleClick}
    >
      <span className='session-tree-page__splitter-line' />
    </button>
  );
}

function SessionTreeList({
  nodes,
  selectedSessionId,
  onSelect,
}: {
  nodes: SessionTreeNode[];
  selectedSessionId: string;
  onSelect: (sessionId: string) => void;
}): ReactElement {
  return (
    <div className='session-tree-list'>
      {nodes.map((node) => {
        const row = node.row;
        const selected = row.sessionId === selectedSessionId;
        const indentDepth = Math.min(node.depth, MAX_TREE_INDENT_DEPTH);
        return (
          <button
            key={row.sessionId}
            type='button'
            className={`session-tree-list__row${
              selected ? ' session-tree-list__row--selected' : ''
            }`}
            style={{
              paddingLeft: `calc(var(--space-2) + ${indentDepth.toString()} * var(--space-3))`,
            }}
            onClick={() => onSelect(row.sessionId)}
          >
            <span className='session-tree-list__branch'>
              {node.depth === 0 ? '●' : `L${node.depth.toString()}`}
            </span>
            <span className='session-tree-list__main'>
              <span className='session-tree-list__top'>
                <MonoValue size='sm'>{row.sessionId.slice(0, 12)}</MonoValue>
                <Chip tone={row.lineageKind === 'fork' ? 'warning' : 'ghost'}>
                  {lineageLabel(row)}
                </Chip>
              </span>
              <span className='session-tree-list__meta'>
                {row.scenario || 'unknown'} · {row.turnCount.toString()} turns ·{' '}
                {row.toolCount.toString()} tools
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrajectoryPane({
  row,
  state,
  forkMessageId,
  onInspectContent,
}: {
  row: SessionRow;
  state: SessionDataState;
  forkMessageId: string;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  return (
    <SessionRunTrajectoryView
      summary={toSessionRunSummary(row)}
      messages={
        state.kind === 'ready'
          ? toSessionRunMessages(state.messages, forkMessageId)
          : []
      }
      loading={state.kind === 'loading' || state.kind === 'idle'}
      error={state.kind === 'error' ? state.message : undefined}
      onInspectContent={onInspectContent}
    />
  );
}

function OutputPane({
  row,
  state,
  onInspectContent,
}: {
  row: SessionRow;
  state: SessionDataState;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  return (
    <SessionRunOutputView
      facts={toSessionRunFacts(row)}
      acceptedSubmission={
        state.kind === 'ready' ? toSessionRunSubmission(state.tools) : null
      }
      tools={state.kind === 'ready' ? toSessionRunTools(state.tools) : []}
      loading={state.kind === 'loading' || state.kind === 'idle'}
      error={state.kind === 'error' ? state.message : undefined}
      onInspectContent={onInspectContent}
    />
  );
}

export default SessionDetail;
