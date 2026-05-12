import { type ReactElement, useEffect, useMemo, useState } from 'react';

import {
  Chip,
  EmptyState,
  ErrorState,
  KeyValueList,
  type KeyValueItem,
  MetricLabel,
  MonoValue,
  TraceTree,
  type TraceSpan,
} from '@lincyaw/aegis-ui';

import { listSpansByRootSession, type SpanRow } from '../api/clickhouse';
import { formatDurationMs } from '../conversation';
import { useTrajectoriesPrefs, type PrimaryView } from '../prefs';
import { useSelection } from '../selection';
import { applySpanFilter } from '../spanFilter';
import { spanDisplayName } from '../spanKind';
import { useKeyboardNav } from '../useKeyboardNav';
import { FilterToolbar } from './FilterToolbar';
import { SessionsTree } from './SessionsTree';
import { ShortcutsHelp } from './ShortcutsHelp';
import { Storyline } from './Storyline';
import { ThreePaneLayout } from './ThreePaneLayout';
import { ViewSettings } from './ViewSettings';

function statusEnumToTone(code: string): TraceSpan['status'] {
  if (code === 'STATUS_CODE_ERROR') {
    return 'error';
  }
  if (code === 'STATUS_CODE_OK') {
    return 'ok';
  }
  return 'unset';
}

function toTraceSpans(spans: SpanRow[]): TraceSpan[] {
  const first = spans[0];
  if (!first) {
    return [];
  }
  const traceStartMs = new Date(first.timestamp).getTime();
  return spans.map((s) => ({
    id: s.spanId,
    parentId: s.parentSpanId || null,
    name: spanDisplayName(s),
    startMs: new Date(s.timestamp).getTime() - traceStartMs,
    durationMs: s.durationNs / 1_000_000,
    status: statusEnumToTone(s.statusCode),
  }));
}

interface TrajectoryWorkspaceProps {
  rootSessionId: string;
  /** When true, share state via URL hash + listen to keyboard events.
   * Set false in compare mode where two workspaces coexist. */
  urlSync: boolean;
}

export function TrajectoryWorkspace({
  rootSessionId,
  urlSync,
}: TrajectoryWorkspaceProps): ReactElement {
  const { prefs, setPrefs, toggleHiddenKind, reset } = useTrajectoriesPrefs();
  const { selection, setSelection } = useSelection(prefs.defaultView, urlSync);
  const [spans, setSpans] = useState<SpanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!rootSessionId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSpansByRootSession(rootSessionId)
      .then((data) => {
        if (!cancelled) {
          setSpans(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [rootSessionId]);

  const filteredSpans = useMemo(
    () => applySpanFilter(spans, prefs, selection.sessionId),
    [spans, prefs, selection.sessionId],
  );
  const treeSpans = useMemo(() => toTraceSpans(filteredSpans), [filteredSpans]);
  const selectedSpan = useMemo(
    () => spans.find((s) => s.spanId === selection.spanId),
    [spans, selection.spanId],
  );
  const sessionIds = useMemo(() => {
    const list: string[] = [''];
    for (const s of spans) {
      if (s.name === 'agentm.session') {
        const sid = s.attributes['agentm.session_id'] ?? '';
        if (sid && !list.includes(sid)) {
          list.push(sid);
        }
      }
    }
    return list;
  }, [spans]);

  useKeyboardNav({
    visibleSpans: urlSync ? filteredSpans : [],
    sessionIds: urlSync ? sessionIds : [],
    selection,
    setSelection,
    toggleInspector: () =>
      setPrefs({ inspectorCollapsed: !prefs.inspectorCollapsed }),
    showHelp: () => setHelpOpen(true),
  });

  if (error) {
    return <ErrorState title='ClickHouse query failed' description={error} />;
  }

  return (
    <div className='trajectories-workspace'>
      <FilterToolbar
        prefs={prefs}
        toggleHiddenKind={toggleHiddenKind}
        setMinDurationMs={(n) => setPrefs({ minDurationMs: n })}
        setErrorsOnly={(b) => setPrefs({ errorsOnly: b })}
        onOpenSettings={() => setSettingsOpen(true)}
        onShowHelp={() => setHelpOpen(true)}
      />

      {loading ? (
        <div style={{ padding: 'var(--space-8)' }}>
          <EmptyState title='Loading spans…' />
        </div>
      ) : (
        <ThreePaneLayout
          leftLabel='Sessions'
          rightLabel='Inspector'
          leftWidth={prefs.sessionsWidth}
          rightWidth={prefs.inspectorWidth}
          leftCollapsed={prefs.sessionsCollapsed}
          rightCollapsed={prefs.inspectorCollapsed}
          onLeftWidthChange={(w) => setPrefs({ sessionsWidth: w })}
          onRightWidthChange={(w) => setPrefs({ inspectorWidth: w })}
          onToggleLeft={() =>
            setPrefs({ sessionsCollapsed: !prefs.sessionsCollapsed })
          }
          onToggleRight={() =>
            setPrefs({ inspectorCollapsed: !prefs.inspectorCollapsed })
          }
          left={
            <SessionsTree
              spans={spans}
              selectedSessionId={selection.sessionId}
              onSelect={(sid) => setSelection({ sessionId: sid })}
            />
          }
          center={
            <CenterPane
              view={selection.view}
              onViewChange={(v) => setSelection({ view: v })}
              filteredSpans={filteredSpans}
              treeSpans={treeSpans}
              selectedSpanId={selection.spanId}
              onSelectSpan={(spanId) => setSelection({ spanId })}
              customRules={prefs.customSpanRules}
            />
          }
          right={
            selectedSpan ? (
              <SpanInspector span={selectedSpan} />
            ) : (
              <div style={{ padding: 'var(--space-4)' }}>
                <EmptyState
                  title='Nothing selected'
                  description='Click a card or row to inspect attributes and events.'
                />
              </div>
            )
          }
        />
      )}

      {settingsOpen && (
        <ViewSettings
          prefs={prefs}
          setPrefs={setPrefs}
          reset={reset}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function CenterPane({
  view,
  onViewChange,
  filteredSpans,
  treeSpans,
  selectedSpanId,
  onSelectSpan,
  customRules,
}: {
  view: PrimaryView;
  onViewChange: (v: PrimaryView) => void;
  filteredSpans: SpanRow[];
  treeSpans: TraceSpan[];
  selectedSpanId: string;
  onSelectSpan: (id: string) => void;
  customRules: ReturnType<typeof useTrajectoriesPrefs>['prefs']['customSpanRules'];
}): ReactElement {
  return (
    <>
      <div className='trajectories-detail__view-tabs'>
        {(['storyline', 'trace'] as const).map((v) => (
          <button
            type='button'
            key={v}
            className={`trajectories-detail__view-tab${
              v === view ? ' trajectories-detail__view-tab--active' : ''
            }`}
            onClick={() => onViewChange(v)}
          >
            {v}
          </button>
        ))}
        <span className='trajectories-detail__view-count'>
          {filteredSpans.length} span{filteredSpans.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className='trajectories-detail__view-body'>
        {view === 'storyline' ? (
          <Storyline
            spans={filteredSpans}
            selectedSpanId={selectedSpanId}
            onSelectSpan={onSelectSpan}
            customRules={customRules}
          />
        ) : (
          <div style={{ padding: 'var(--space-3)' }}>
            <TraceTree
              spans={treeSpans}
              selectedId={selectedSpanId}
              onSelect={(s) => onSelectSpan(s.id)}
            />
          </div>
        )}
      </div>
    </>
  );
}

function SpanInspector({ span }: { span: SpanRow }): ReactElement {
  const top: KeyValueItem[] = [
    { k: 'name', v: <MonoValue size='sm'>{span.name}</MonoValue> },
    { k: 'span_id', v: <MonoValue size='sm'>{span.spanId}</MonoValue> },
    {
      k: 'duration',
      v: (
        <MonoValue size='sm'>
          {formatDurationMs(span.durationNs / 1_000_000)}
        </MonoValue>
      ),
    },
    {
      k: 'status',
      v: (
        <Chip
          tone={span.statusCode === 'STATUS_CODE_ERROR' ? 'warning' : 'ghost'}
        >
          {span.statusCode || 'unset'}
        </Chip>
      ),
    },
  ];
  if (span.statusMessage) {
    top.push({ k: 'status_msg', v: span.statusMessage });
  }

  const attrEntries = Object.entries(span.attributes).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className='trajectories-detail__inspector'>
      <KeyValueList items={top} />
      {attrEntries.length > 0 && (
        <div>
          <MetricLabel size='xs'>attributes</MetricLabel>
          <div className='trajectories-detail__attrs'>
            {attrEntries.map(([k, v]) => (
              <KeyValueRow key={k} k={k} v={v} />
            ))}
          </div>
        </div>
      )}
      {span.events.length > 0 && (
        <div>
          <MetricLabel size='xs'>events</MetricLabel>
          <ul className='trajectories-detail__events'>
            {span.events.map((ev, i) => (
              <li key={i}>
                <MonoValue size='sm'>{ev.name}</MonoValue>{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  {Object.entries(ev.attributes)
                    .map(([k, v]) => `${k}=${v}`)
                    .join('  ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeyValueRow({ k, v }: { k: string; v: string }): ReactElement {
  const isLong = v.length > 80 || v.includes('\n');
  return (
    <>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      {isLong ? (
        <pre className='trajectories-detail__attr-pre'>{v}</pre>
      ) : (
        <span style={{ wordBreak: 'break-word' }}>{v}</span>
      )}
    </>
  );
}

export default TrajectoryWorkspace;
