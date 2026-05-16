import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';
import type { TaskResp } from '@lincyaw/portal';

import { StatusChip } from '../components/StatusChip';
import { useActiveProjectNumericId } from '../hooks/useActiveProjectNumericId';
import { useTasksList } from '../hooks/useTasks';

export default function Tasks() {
  const href = useAppHref();
  const projectId = useActiveProjectNumericId();
  const { data, isLoading, isError, error, refetch } = useTasksList({
    projectId,
  });
  const items: TaskResp[] = data?.items ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Tasks'
        description='Background jobs across injections, regressions, and evals.'
      />
      <Panel>
        {isError ? (
          <ErrorState
            title='Failed to load tasks'
            description={
              error instanceof Error ? error.message : 'Unknown error'
            }
            action={
              <Button
                tone='secondary'
                onClick={() => {
                  void refetch();
                }}
              >
                Retry
              </Button>
            }
          />
        ) : isLoading ? (
          <EmptyState title='Loading…' description='Fetching tasks.' />
        ) : items.length === 0 ? (
          <EmptyState
            title='No tasks'
            description='No background jobs in this project yet.'
          />
        ) : (
          <DataTable<TaskResp>
            data={items}
            rowKey={(r) => r.id ?? ''}
            columns={[
              {
                key: 'id',
                header: 'Task',
                render: (r) => (
                  <Link to={href(`tasks/${r.id ?? ''}`)}>
                    <MonoValue size='sm'>{r.id ?? '—'}</MonoValue>
                  </Link>
                ),
              },
              { key: 'type', header: 'Kind', render: (r) => r.type ?? '—' },
              {
                key: 'trace',
                header: 'Trace',
                render: (r) => (
                  <MonoValue size='sm'>{r.trace_id ?? '—'}</MonoValue>
                ),
              },
              {
                key: 'state',
                header: 'State',
                render: (r) => (
                  <StatusChip status={r.state ?? r.status ?? 'pending'} />
                ),
              },
              {
                key: 'started',
                header: 'Created',
                render: (r) => <TimeDisplay value={r.created_at ?? ''} />,
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
