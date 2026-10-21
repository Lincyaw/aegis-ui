import {
  type CSSProperties,
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
  useResizable,
} from '@lincyaw/aegis-ui';

import {
  getSessionRow,
  listSessionRows,
  type SessionRow,
} from '../api/clickhouse';
import { useCompareList } from '../compareList';
import { OutputPane, TrajectoryPane } from '../SessionPanes';
import { lineageLabel, parentKey, useSessionData } from '../sessionRunAdapters';

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

function buildTree(rows: SessionRow[], selectedId: string): SessionTreeNode[] {
  const byId = new Map(rows.map((row) => [row.sessionId, row]));
  const selected = byId.get(selectedId);
  if (!selected) {
    return [];
  }
  let root = selected;
  const seen = new Set<string>();
  while (
    parentKey(root) &&
    byId.has(parentKey(root)) &&
    !seen.has(root.sessionId)
  ) {
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
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
  });

  const walk = (row: SessionRow, depth: number): SessionTreeNode => ({
    row,
    depth,
    children: (childrenByParent.get(row.sessionId) ?? []).map((child) =>
      walk(child, depth + 1)
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

function mergeSessionRows(
  rows: SessionRow[],
  required: SessionRow | null
): SessionRow[] {
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
  const leftWidthRef = useRef(DEFAULT_LEFT_WIDTH);
  const rightWidthRef = useRef(DEFAULT_RIGHT_WIDTH);
  const besideMinCenter = (width: number, otherPaneWidth: number): number => {
    const containerWidth = layoutRef.current?.getBoundingClientRect().width;
    if (!containerWidth) {
      return width;
    }
    return Math.min(
      width,
      containerWidth - SPLITTER_TOTAL_WIDTH - MIN_CENTER_WIDTH - otherPaneWidth
    );
  };
  const leftPane = useResizable({
    side: 'left',
    initialWidth: DEFAULT_LEFT_WIDTH,
    minWidth: MIN_LEFT_WIDTH,
    maxWidth: MAX_LEFT_WIDTH,
    keyboardStep: PANE_KEYBOARD_STEP,
    constrainWidth: (width) => besideMinCenter(width, rightWidthRef.current),
  });
  const rightPane = useResizable({
    side: 'right',
    initialWidth: DEFAULT_RIGHT_WIDTH,
    minWidth: MIN_RIGHT_WIDTH,
    maxWidth: MAX_RIGHT_WIDTH,
    keyboardStep: PANE_KEYBOARD_STEP,
    constrainWidth: (width) => besideMinCenter(width, leftWidthRef.current),
  });
  const [treeLoad, setTreeLoad] = useState<LoadState>({ kind: 'loading' });
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId);
  const sessionData = useSessionData(selectedSessionId);
  const [inspectedContent, setInspectedContent] =
    useState<InspectableContent | null>(null);

  useEffect(() => {
    leftWidthRef.current = leftPane.width;
    rightWidthRef.current = rightPane.width;
  }, [leftPane.width, rightPane.width]);

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
          setTreeLoad({
            kind: 'ready',
            rows: mergeSessionRows(rows, requiredRow),
          });
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

  const rows = useMemo(
    () => (treeLoad.kind === 'ready' ? treeLoad.rows : []),
    [treeLoad]
  );
  const selectedRow = rows.find((row) => row.sessionId === selectedSessionId);
  const tree = useMemo(
    () => buildTree(rows, selectedSessionId || sessionId),
    [rows, selectedSessionId, sessionId]
  );
  const visibleTree = useMemo(() => flattenTree(tree), [tree]);
  const pinSessionId = selectedRow?.sessionId || selectedSessionId;
  const isPinned = pinSessionId ? pinned.includes(pinSessionId) : false;
  const layoutStyle = {
    '--session-tree-left-width': `${leftPane.width.toString()}px`,
    '--session-tree-right-width': `${rightPane.width.toString()}px`,
  } as CSSProperties;
  const resizing = leftPane.isDragging || rightPane.isDragging;

  const resetPaneWidths = (): void => {
    // Each pane's constraint reads the other pane's width. Both reset in
    // the same render, so point them at the defaults, not the old widths.
    leftWidthRef.current = DEFAULT_LEFT_WIDTH;
    rightWidthRef.current = DEFAULT_RIGHT_WIDTH;
    leftPane.reset();
    rightPane.reset();
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
      {treeLoad.kind === 'loading' && (
        <EmptyState title='Loading session tree…' />
      )}
      {treeLoad.kind === 'ready' && !selectedRow && (
        <ErrorState
          title='Session not found'
          description='Try widening the session table time range, or verify the session id exists in ClickHouse.'
        />
      )}
      {treeLoad.kind === 'ready' && selectedRow && (
        <div
          ref={layoutRef}
          className={`session-tree-page${
            resizing ? ' session-tree-page--resizing' : ''
          }`}
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
          <div
            {...leftPane.handleProps}
            className='session-tree-page__splitter'
            aria-label='Resize session tree pane'
            onDoubleClick={resetPaneWidths}
          >
            <span className='session-tree-page__splitter-line' />
          </div>
          <main className='session-tree-page__trajectory'>
            <header className='session-tree-page__pane-head'>
              Trajectory
              <MetricLabel size='xs'>
                {selectedSessionId.slice(0, 12)}
              </MetricLabel>
            </header>
            <TrajectoryPane
              row={selectedRow}
              state={sessionData}
              onInspectContent={setInspectedContent}
            />
          </main>
          <div
            {...rightPane.handleProps}
            className='session-tree-page__splitter'
            aria-label='Resize output pane'
            onDoubleClick={resetPaneWidths}
          >
            <span className='session-tree-page__splitter-line' />
          </div>
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

export default SessionDetail;
