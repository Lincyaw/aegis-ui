import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  Dialog,
  EmptyState,
  ErrorState,
  KeyValueList,
  Markdown,
  MonoValue,
  ResizableSidePanel,
  Skeleton,
} from '@lincyaw/aegis-ui';
import type { Context, Item, Task, Verdict } from '@lincyaw/review-api';
import { useQueryClient } from '@tanstack/react-query';

import { loadAdvance, saveAdvance } from '../connection';
import {
  focusNodes,
  type Graph,
  indexGraph,
  namedIds,
  neighbours,
} from '../evidence/board';
import { fmtDateTime } from '../evidence/format';
import { type ReviewStrings, useReviewStrings } from '../locale/context';
import {
  reviewKeys,
  useItems,
  useServerInfo,
  useTask,
  useTopology,
  useVerdicts,
} from '../queries';
import { repoKey, useReview } from '../review';
import { ClaimBar, FactValue } from '../workspace/ClaimBar';
import { DetailPanel } from '../workspace/DetailPanel';
import { EvidenceBoard } from '../workspace/EvidenceBoard';
import { ItemRail } from '../workspace/ItemRail';
import { matchesFilter, type RailFilter, railOrder } from '../workspace/items';
import { claimSelection, type Selection } from '../workspace/selection';
import { useVerdictSaver } from '../workspace/useVerdictSaver';
import { type Blocked, VerdictDock } from '../workspace/VerdictDock';

import './WorkspacePage.css';

const RAIL_COLLAPSED_KEY = 'aegis.review.rail-collapsed';

/** How the board around one item looks: kept while moving between items. */
interface ViewState {
  selection?: Selection;
  expanded: string[];
  /** Chips added to the focused view. */
  extra: string[];
  /** Chips whose neighbours were added: their links are drawn too. */
  pivots: string[];
  showAll: boolean;
  /** In the focused view, also draw links between the claim's neighbours. */
  neighbourLinks: boolean;
}

const EMPTY_VIEW: ViewState = {
  expanded: [],
  extra: [],
  pivots: [],
  showAll: false,
  neighbourLinks: false,
};

/** Below this width the rail opens folded, leaving the board the room. */
const RAIL_ROOM_QUERY = '(min-width: 1680px)';

function loadRailCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(RAIL_COLLAPSED_KEY);
    if (stored !== null) {
      return stored === '1';
    }
  } catch {
    // Without storage, decide from the window's width.
  }
  return !window.matchMedia(RAIL_ROOM_QUERY).matches;
}

function saveRailCollapsed(value: boolean): void {
  try {
    localStorage.setItem(RAIL_COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    // Remembering the rail is a convenience; without storage it opens.
  }
}

/** Keys typed into a field, or with a modifier, or under a dialog, are not shortcuts. */
function isShortcutTarget(event: KeyboardEvent): boolean {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return false;
  }
  const target = event.target as HTMLElement | null;
  if (
    target !== null &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  ) {
    return false;
  }
  return document.querySelector('[role="dialog"]') === null;
}

/** Whether the arrow keys move between items rather than inside a control. */
function arrowsNavigate(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return (
    target === null ||
    target === document.body ||
    target.closest('.review-rail') !== null
  );
}

function ContextDialog({
  context,
  open,
  onClose,
  s,
}: {
  context: Context | undefined;
  open: boolean;
  onClose: () => void;
  s: ReviewStrings;
}): ReactElement | null {
  if (context === undefined) {
    return null;
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={context.title}
      description={s.caseOfItem}
      width='lg'
    >
      <KeyValueList
        items={[
          ...(context.facts ?? []).map((fact) => ({
            k: fact.label,
            v: <FactValue fact={fact} />,
          })),
          ...context.windows.map((w) => ({
            k: s.windowFact(w.name),
            v: `${fmtDateTime(w.start)} → ${fmtDateTime(w.end)}`,
          })),
          ...context.markers.map((m) => ({
            k: m.kind === 'injection' ? s.injection : s.marker,
            v: (
              <span className='review-ws__marker'>
                <MonoValue size='sm'>{fmtDateTime(m.at)}</MonoValue>
                <span>{m.label}</span>
              </span>
            ),
          })),
        ]}
      />
    </Dialog>
  );
}

interface WorkspaceProps {
  task: Task;
  items: Item[];
  item: Item;
  verdicts: ReadonlyMap<string, Verdict>;
  blocked: Blocked | undefined;
}

function Workspace({
  task,
  items,
  item,
  verdicts,
  blocked,
}: WorkspaceProps): ReactElement {
  const s = useReviewStrings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { connection, repo } = useReview();
  const saver = useVerdictSaver(task.id, connection.reviewer);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [filter, setFilter] = useState<RailFilter>('all');
  const [query, setQuery] = useState('');
  const [railCollapsed, setRailCollapsed] = useState(loadRailCollapsed);
  const [advance, setAdvance] = useState(loadAdvance);
  const [guideOpen, setGuideOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [views, setViews] = useState<Record<string, ViewState>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const visibleItems = useMemo(
    () =>
      items.filter((i) => matchesFilter(i, filter, query, verdicts.has(i.id))),
    [items, filter, query, verdicts]
  );
  const shown = useMemo(
    () => new Set(visibleItems.map((i) => i.id)),
    [visibleItems]
  );
  const index = items.findIndex((i) => i.id === item.id);
  const next = items.slice(index + 1).find((i) => shown.has(i.id));
  const previous = items
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((i) => shown.has(i.id));

  const open = useCallback(
    (target: Item | undefined): void => {
      if (target !== undefined) {
        navigate(`../${encodeURIComponent(target.id)}`, { relative: 'path' });
      }
    },
    [navigate]
  );

  const topology = useTopology(item.contextId);
  const graph = useMemo(
    (): Graph | undefined =>
      topology.data === undefined
        ? undefined
        : indexGraph(topology.data, namedIds(item)),
    [topology.data, item]
  );

  // The next item's case is usually needed a few seconds from now.
  useEffect(() => {
    if (next !== undefined && next.contextId !== item.contextId) {
      void queryClient.prefetchQuery({
        queryKey: reviewKeys.topology(repoKey(repo), next.contextId),
        queryFn: () => repo.getTopology(next.contextId),
        staleTime: Infinity,
      });
    }
  }, [next, item.contextId, queryClient, repo]);

  const view = views[item.id] ?? EMPTY_VIEW;
  const setView = (patch: Partial<ViewState>): void => {
    setViews((all) => ({
      ...all,
      [item.id]: { ...(all[item.id] ?? EMPTY_VIEW), ...patch },
    }));
  };
  const focusIds = useMemo(
    () => (graph === undefined ? [] : [...focusNodes(graph, item)]),
    [graph, item]
  );
  const visible = useMemo((): ReadonlySet<string> => {
    if (graph === undefined) {
      return new Set();
    }
    return view.showAll
      ? new Set(graph.nodes.keys())
      : new Set([...focusIds, ...view.extra]);
  }, [graph, focusIds, view.extra, view.showAll]);
  const selection = view.selection ?? claimSelection(graph, item);

  const verdict = verdicts.get(item.id);
  const note = drafts[item.id] ?? verdict?.note ?? '';

  const save = (value: string, text: string): void => {
    if (blocked !== undefined) {
      return;
    }
    saver.save({ itemId: item.id, value, note: text });
  };
  const judge = (value: string): void => {
    save(value, note);
    if (advance && next !== undefined) {
      open(next);
    }
  };

  // Shortcuts: J/K (and the arrows on the rail) move, the options' keys judge.
  const judgeRef = useRef(judge);
  judgeRef.current = judge;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!isShortcutTarget(event)) {
        return;
      }
      const key = event.key;
      if (key === 'j' || (key === 'ArrowDown' && arrowsNavigate(event))) {
        event.preventDefault();
        open(next);
        return;
      }
      if (key === 'k' || (key === 'ArrowUp' && arrowsNavigate(event))) {
        event.preventDefault();
        open(previous);
        return;
      }
      if (key === '?' && task.instructions !== undefined) {
        event.preventDefault();
        setGuideOpen(true);
        return;
      }
      const option = task.verdictOptions.find(
        (o) =>
          o.shortcut !== undefined &&
          o.shortcut.toLowerCase() === key.toLowerCase()
      );
      if (option !== undefined) {
        event.preventDefault();
        judgeRef.current(option.value);
        return;
      }
      if (key === 'n' && noteRef.current !== null) {
        event.preventDefault();
        noteRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [next, previous, open, task.instructions, task.verdictOptions]);

  const context = topology.data?.context;
  const board = ((): ReactElement => {
    if (topology.isPending) {
      return (
        <div className='review-ws__loading'>
          <Skeleton height='100%' />
        </div>
      );
    }
    if (topology.isError || graph === undefined || context === undefined) {
      return (
        <ErrorState
          title={s.caseFailed}
          description={topology.error?.message ?? s.noTopology}
        />
      );
    }
    return (
      <div className='review-ws__stage'>
        <div className='review-ws__board'>
          <EvidenceBoard
            graph={graph}
            item={item}
            visible={visible}
            focusIds={focusIds}
            pivots={view.pivots}
            showAll={view.showAll}
            neighbourLinks={view.neighbourLinks}
            expandedIds={view.expanded}
            selection={selection}
            onSelect={(chosen) => {
              setView({ selection: chosen });
            }}
            onToggleExpand={(id) => {
              setView({
                expanded: view.expanded.includes(id)
                  ? view.expanded.filter((e) => e !== id)
                  : [...view.expanded, id],
              });
            }}
            onAddNeighbours={(id, side) => {
              const ids =
                side === undefined
                  ? neighbours(graph, id)
                  : side === 'out'
                    ? (graph.out.get(id) ?? []).map((l) => l.target)
                    : (graph.into.get(id) ?? []).map((l) => l.source);
              setView({
                extra: [...new Set([...view.extra, ...ids])],
                pivots: [...new Set([...view.pivots, id])],
              });
            }}
            onShowAll={(showAll) => {
              setView({ showAll });
            }}
            onNeighbourLinks={(on) => {
              setView({ neighbourLinks: on });
            }}
            onReset={
              view.showAll ||
              view.neighbourLinks ||
              view.extra.length > 0 ||
              view.expanded.length > 0
                ? () => {
                    setView({
                      showAll: false,
                      neighbourLinks: false,
                      extra: [],
                      pivots: [],
                      expanded: [],
                    });
                  }
                : undefined
            }
          />
        </div>
        <ResizableSidePanel
          side='right'
          defaultWidth={440}
          minWidth={360}
          maxWidth={820}
          persistKey='aegis.review.detail-width'
          resetOnDoubleClick
          className='review-ws__detail'
        >
          <DetailPanel
            graph={graph}
            context={context}
            item={item}
            selection={selection}
            onSelect={(chosen) => {
              setView({ selection: chosen });
            }}
          />
        </ResizableSidePanel>
      </div>
    );
  })();

  return (
    <div className='review-ws'>
      <ResizableSidePanel
        side='left'
        defaultWidth={288}
        minWidth={232}
        maxWidth={440}
        persistKey='aegis.review.rail-width'
        collapsible
        collapsed={railCollapsed}
        onCollapsedChange={(value) => {
          setRailCollapsed(value);
          saveRailCollapsed(value);
        }}
        className='review-ws__rail'
      >
        <ItemRail
          items={items}
          visible={visibleItems}
          verdicts={verdicts}
          options={task.verdictOptions}
          currentId={item.id}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          onOpen={open}
          onCollapse={() => {
            setRailCollapsed(true);
            saveRailCollapsed(true);
          }}
        />
      </ResizableSidePanel>
      <div className='review-ws__main'>
        <ClaimBar
          item={item}
          context={context}
          position={index + 1}
          total={items.length}
          judged={
            railCollapsed
              ? items.filter((i) => verdicts.has(i.id)).length
              : undefined
          }
          onShowRail={() => {
            setRailCollapsed(false);
            saveRailCollapsed(false);
          }}
          onPrevious={
            previous === undefined
              ? undefined
              : () => {
                  open(previous);
                }
          }
          onNext={
            next === undefined
              ? undefined
              : () => {
                  open(next);
                }
          }
          onInstructions={
            task.instructions === undefined
              ? undefined
              : () => {
                  setGuideOpen(true);
                }
          }
          onContext={() => {
            setContextOpen(true);
          }}
        />
        {board}
        <VerdictDock
          itemId={item.id}
          options={task.verdictOptions}
          verdict={verdict}
          blocked={blocked}
          saveState={saver.state}
          onSave={(value, text) => {
            save(value, text);
          }}
          onJudge={judge}
          advance={advance}
          onAdvance={(value) => {
            setAdvance(value);
            saveAdvance(value);
          }}
          noteRef={noteRef}
          note={note}
          onNote={(text) => {
            setDrafts((all) => ({ ...all, [item.id]: text }));
          }}
        />
      </div>
      {task.instructions !== undefined && (
        <Dialog
          open={guideOpen}
          onClose={() => {
            setGuideOpen(false);
          }}
          title={s.guideTitle(task.title)}
          width='lg'
        >
          <div className='review-ws__guide'>
            <Markdown variant='document'>{task.instructions}</Markdown>
          </div>
        </Dialog>
      )}
      <ContextDialog
        s={s}
        context={context}
        open={contextOpen}
        onClose={() => {
          setContextOpen(false);
        }}
      />
    </div>
  );
}

export function WorkspacePage(): ReactElement {
  const s = useReviewStrings();
  const { taskId = '', itemId } = useParams();
  const { connection } = useReview();
  const server = useServerInfo();
  const task = useTask(taskId);
  const items = useItems(taskId);
  const verdicts = useVerdicts(taskId, connection.reviewer);

  const ordered = useMemo(() => railOrder(items.data ?? []), [items.data]);
  const verdictMap = useMemo(
    () => new Map((verdicts.data ?? []).map((v) => [v.itemId, v])),
    [verdicts.data]
  );

  if (
    task.isPending ||
    items.isPending ||
    (itemId === undefined && verdicts.isLoading)
  ) {
    return (
      <div className='review-ws review-ws--loading'>
        <Skeleton height='100%' />
      </div>
    );
  }
  if (task.isError || items.isError) {
    return (
      <ErrorState
        title={s.taskFailed}
        description={(task.error ?? items.error)?.message}
      />
    );
  }
  if (ordered.length === 0) {
    return <EmptyState title={s.noItems} />;
  }
  const item = ordered.find((i) => i.id === itemId);
  if (item === undefined) {
    const first = ordered.find((i) => !verdictMap.has(i.id)) ?? ordered[0];
    const to = encodeURIComponent(first.id);
    return (
      <Navigate
        to={itemId === undefined ? to : `../${to}`}
        relative='path'
        replace
      />
    );
  }

  const blocked: Blocked | undefined =
    connection.reviewer === ''
      ? { text: s.blockedReviewer, setReviewer: true }
      : server.data?.writable === false
        ? { text: s.blockedReadOnly, setReviewer: false }
        : verdicts.isError
          ? {
              text: s.blockedVerdicts(verdicts.error.message),
              setReviewer: false,
            }
          : undefined;

  return (
    <Workspace
      task={task.data}
      items={ordered}
      item={item}
      verdicts={verdictMap}
      blocked={blocked}
    />
  );
}
