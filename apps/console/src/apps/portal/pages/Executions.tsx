import type { ExecutionExecutionResp } from '@lincyaw/portal';
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
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useActiveProjectNumericId } from '../hooks/useActiveProjectNumericId';
import { useExecutionsList } from '../hooks/useExecutions';

export default function Executions() {
  const projectId = useActiveProjectNumericId();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading, isError, error, refetch } = useExecutionsList(projectId);
  const items: ExecutionExecutionResp[] = data?.items ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Executions'
        description={`Algorithm + eval executions for project ${String(projectId)}.`}
        action={
          <Button
            tone='primary'
            onClick={() => {
              navigate('executions/new');
            }}
          >
            + Run algorithm
          </Button>
        }
      />
      <Panel>
        {isError ? (
          <ErrorState
            title='Failed to load executions'
            description={error instanceof Error ? error.message : 'Unknown error'}
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
          <EmptyState title='Loading…' description='Fetching executions.' />
        ) : items.length === 0 ? (
          <EmptyState title='No executions' description='Run an algorithm to see results here.' />
        ) : (
          <DataTable<ExecutionExecutionResp>
            data={items}
            rowKey={(r) => String(r.id ?? '')}
            columns={[
              {
                key: 'id',
                header: 'Execution',
                render: (r) => (
                  <Link to={href(`executions/${String(r.id ?? '')}`)}>
                    <MonoValue size='sm'>{String(r.id ?? '—')}</MonoValue>
                  </Link>
                ),
              },
              {
                key: 'algorithm',
                header: 'Algorithm',
                render: (r) =>
                  `${r.algorithm_name ?? '—'}${r.algorithm_version ? ` @ ${r.algorithm_version}` : ''}`,
              },
              {
                key: 'datapack',
                header: 'Datapack',
                render: (r) => <MonoValue size='sm'>{r.datapack_name ?? '—'}</MonoValue>,
              },
              {
                key: 'state',
                header: 'State',
                render: (r) => <StatusChip status={r.state ?? r.status ?? 'pending'} />,
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
