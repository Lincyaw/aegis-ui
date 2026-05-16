import { useParams } from 'react-router-dom';

import {
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

import { StatusChip } from '../components/StatusChip';
import { useTaskDetail } from '../hooks/useTasks';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data, isLoading, isError, error } = useTaskDetail(taskId);

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
            description={error instanceof Error ? error.message : 'Unknown task.'}
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

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Task ${data.id ?? ''}`}
        description={`${data.type ?? 'task'} · project ${data.project_name ?? String(data.project_id ?? '')}`}
        action={<StatusChip status={data.state ?? data.status ?? 'pending'} />}
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
          <EmptyState title='No logs yet' description='Logs will appear as the task progresses.' />
        )}
      </Panel>
    </div>
  );
}
