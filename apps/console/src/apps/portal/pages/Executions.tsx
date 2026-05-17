import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  PageSizeSelect,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { ExecutionExecutionResp } from '@lincyaw/portal';

import { StatusChip } from '../components/StatusChip';
import { useActiveProjectIdNum } from '../hooks/useActiveProject';
import { useExecutionsList } from '../hooks/useExecutions';
import { usePageSize } from '../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Executions() {
  const projectId = useActiveProjectIdNum();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { size, setSize } = usePageSize('executions', 20);
  const { data, isLoading, isError, error, refetch } = useExecutionsList(
    projectId,
    { size }
  );
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
          <EmptyState title='Loading…' description='Fetching executions.' />
        ) : items.length === 0 ? (
          <EmptyState
            title='No executions'
            description='Run an algorithm to see results here.'
          />
        ) : (
          <>
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
                render: (r) => (
                  <MonoValue size='sm'>{r.datapack_name ?? '—'}</MonoValue>
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
          <div className='page-table-footer'>
            <PageSizeSelect
              value={size}
              onChange={setSize}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>
          </>
        )}
      </Panel>
    </div>
  );
}
