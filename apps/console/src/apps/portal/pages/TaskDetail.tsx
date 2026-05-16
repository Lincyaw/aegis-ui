import { useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  ErrorState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';

import { tasksApi } from '../api/portal-client';
import { StatusChip } from '../components/StatusChip';
import { useTaskDetail } from '../hooks/useTasks';

const CANCELLABLE_STATES = new Set([
  'Pending',
  'Rescheduled',
  'Running',
  'pending',
  'rescheduled',
  'running',
]);

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data, isLoading, isError, error } = useTaskDetail(taskId);
  const { message: msg } = AntdApp.useApp();
  const qc = useQueryClient();

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const res = await tasksApi.cancelTask({ taskId: id });
      return res.data.data;
    },
    onSuccess: () => {
      void msg.success('Task cancelled');
      void qc.invalidateQueries({ queryKey: ['portal', 'task'] });
      void qc.invalidateQueries({ queryKey: ['portal', 'tasks'] });
    },
    onError: (e: unknown) => {
      void msg.error(e instanceof Error ? e.message : 'Cancel failed');
    },
  });

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Task ${taskId ?? ''}`} />
        <Panel>
          <EmptyState title='Loading…' description='Fetching task.' />
        </Panel>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Task ${taskId ?? ''}`} />
        <Panel>
          <ErrorState
            title='Not found'
            description={
              error instanceof Error ? error.message : 'Unknown task.'
            }
          />
        </Panel>
      </div>
    );
  }

  const lines: TerminalLine[] = (data.logs ?? []).map((body, i) => ({
    ts: String(i),
    level: 'info',
    body,
  }));

  const cancellable =
    typeof data.id === 'string' &&
    data.id.length > 0 &&
    CANCELLABLE_STATES.has(data.state ?? data.status ?? '');

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Task ${data.id ?? ''}`}
        description={`${data.type ?? 'task'} · project ${data.project_name ?? String(data.project_id ?? '')}`}
        action={
          <div className='page-action-row'>
            <StatusChip status={data.state ?? data.status ?? 'pending'} />
            {cancellable && (
              <Button
                tone='secondary'
                disabled={cancel.isPending}
                onClick={() => {
                  if (typeof data.id === 'string') {
                    cancel.mutate(data.id);
                  }
                }}
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel task'}
              </Button>
            )}
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'type', v: data.type ?? '—' },
            {
              k: 'trace',
              v: <MonoValue size='sm'>{data.trace_id ?? '—'}</MonoValue>,
            },
            {
              k: 'group',
              v: <MonoValue size='sm'>{data.group_id ?? '—'}</MonoValue>,
            },
            { k: 'state', v: data.state ?? '—' },
            { k: 'status', v: data.status ?? '—' },
          ]}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Logs</PanelTitle>}>
        {lines.length > 0 ? (
          <Terminal lines={lines} />
        ) : (
          <EmptyState
            title='No logs yet'
            description='Logs will appear as the task progresses.'
          />
        )}
      </Panel>
    </div>
  );
}
