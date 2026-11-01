import type { ReactElement } from 'react';

import type { InspectableContent } from '@lincyaw/aegis-ui';

import type { SessionRow } from './api/clickhouse';

import {
  type SessionDataState,
  toSessionRunFacts,
  toSessionRunMessages,
  toSessionRunSubmission,
  toSessionRunSummary,
  toSessionRunTools,
} from './sessionRunAdapters';
import {
  SessionRunOutputView,
  SessionRunTrajectoryView,
} from './SessionRunView';

interface SessionPaneProps {
  row: SessionRow;
  state: SessionDataState;
  onInspectContent: (content: InspectableContent) => void;
}

export function TrajectoryPane({
  row,
  state,
  onInspectContent,
}: SessionPaneProps): ReactElement {
  return (
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
  );
}

export function OutputPane({
  row,
  state,
  onInspectContent,
}: SessionPaneProps): ReactElement {
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
