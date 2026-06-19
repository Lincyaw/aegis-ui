import { type ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  ContentInspectorDialog,
  EmptyState,
  ErrorState,
  type InspectableContent,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SessionRunOutputView,
  SessionRunTrajectoryView,
} from '@lincyaw/aegis-ui';

import {
  getSessionRow,
  listMessagesBySession,
  listToolsBySession,
  type SessionRow,
} from '../api/clickhouse';
import { useCompareList } from '../compareList';
import {
  type SessionDataState,
  toSessionRunFacts,
  toSessionRunMessages,
  toSessionRunSubmission,
  toSessionRunSummary,
  toSessionRunTools,
} from '../sessionRunAdapters';

import './Compare.css';

export function Compare(): ReactElement {
  const { pinned, remove, clear } = useCompareList();
  const [a, b] = pinned;
  const [inspectedContent, setInspectedContent] =
    useState<InspectableContent | null>(null);

  if (!a) {
    return (
      <Panel
        title={<PanelTitle size='lg'>Compare</PanelTitle>}
        extra={
          <Link to='..' style={{ color: 'inherit' }}>
            <Chip>← back to sessions</Chip>
          </Link>
        }
      >
        <EmptyState
          title='No trajectories pinned'
          description='Open a session and click ☆ pin to compare to add up to two trajectories side by side.'
        />
      </Panel>
    );
  }

  return (
    <div className='trajectories-compare'>
      <Panel
        title={<PanelTitle size='lg'>Compare</PanelTitle>}
        extra={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
              <Chip>← back</Chip>
            </Link>
            <Chip tone='warning' onClick={clear}>
              clear pins
            </Chip>
          </div>
        }
      />
      <div className='trajectories-compare__split'>
        <CompareColumn
          sessionId={a}
          label='A'
          onUnpin={() => remove(a)}
          onInspectContent={setInspectedContent}
        />
        {b ? (
          <CompareColumn
            sessionId={b}
            label='B'
            onUnpin={() => remove(b)}
            onInspectContent={setInspectedContent}
          />
        ) : (
          <div className='trajectories-compare__empty'>
            <EmptyState
              title='Pin a second trajectory'
              description='Open another session and pin it to fill this side.'
            />
          </div>
        )}
      </div>
      <ContentInspectorDialog
        open={inspectedContent !== null}
        content={inspectedContent}
        onClose={() => setInspectedContent(null)}
      />
    </div>
  );
}

function CompareColumn({
  sessionId,
  label,
  onUnpin,
  onInspectContent,
}: {
  sessionId: string;
  label: 'A' | 'B';
  onUnpin: () => void;
  onInspectContent: (content: InspectableContent) => void;
}): ReactElement {
  const [row, setRow] = useState<SessionRow | null>(null);
  const [state, setState] = useState<SessionDataState>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRow(null);
    setState({ kind: 'loading' });
    setError(null);
    Promise.all([
      getSessionRow(sessionId),
      listMessagesBySession(sessionId),
      listToolsBySession(sessionId),
    ])
      .then(([nextRow, messages, tools]) => {
        if (!cancelled) {
          if (nextRow === null) {
            setError('Session not found');
            setState({ kind: 'error', message: 'Session not found' });
            return;
          }
          setRow(nextRow);
          setState({ kind: 'ready', messages, tools });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className='trajectories-compare__col'>
      <header className='trajectories-compare__col-header'>
        <Chip tone='ink'>{label}</Chip>
        <Link
          to={`/trajectories/${sessionId}`}
          style={{ color: 'inherit', textDecoration: 'none', flex: '1 1 auto' }}
        >
          <MonoValue size='sm'>{sessionId.slice(0, 16)}…</MonoValue>
        </Link>
        <Chip onClick={onUnpin}>unpin</Chip>
        <MetricLabel size='xs'>open ↗</MetricLabel>
      </header>
      {error ? (
        <ErrorState title='Failed to load session' description={error} />
      ) : row === null ? (
        <EmptyState title='Loading session…' />
      ) : (
        <div className='trajectories-compare__session-body'>
          <section className='trajectories-compare__pane trajectories-compare__pane--trajectory'>
            <header className='trajectories-compare__pane-head'>Trajectory</header>
            <SessionRunTrajectoryView
              summary={toSessionRunSummary(row)}
              messages={
                state.kind === 'ready'
                  ? toSessionRunMessages(state.messages, row.forkMessageId)
                  : []
              }
              loading={state.kind === 'loading' || state.kind === 'idle'}
              error={state.kind === 'error' ? state.message : undefined}
              onInspectContent={onInspectContent}
            />
          </section>
          <section className='trajectories-compare__pane trajectories-compare__pane--output'>
            <header className='trajectories-compare__pane-head'>Output</header>
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
          </section>
        </div>
      )}
    </div>
  );
}

export default Compare;
