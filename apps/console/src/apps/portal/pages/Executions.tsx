import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { ExecutionExecutionResp } from '@lincyaw/portal';

import { errMsg } from '../../../api/apiClient';
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
  // Switching the active project starts again from the first page.
  const [paging, setPaging] = useState({ projectId, page: 1 });
  const page = paging.projectId === projectId ? paging.page : 1;
  const { data, isLoading, isError, error, refetch } = useExecutionsList(
    projectId,
    { page, size }
  );
  const items: ExecutionExecutionResp[] = data?.items ?? [];

  return (
    <>
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
            description={errMsg(error, 'Unknown error')}
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
        ) : (
          <DataTable<ExecutionExecutionResp>
            loading={isLoading}
            emptyTitle='No executions'
            emptyDescription='Run an algorithm to see results here.'
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
            pagination={{
              page,
              pageSize: size,
              total: data?.pagination?.total,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: (nextPage, nextSize) => {
                setPaging({ projectId, page: nextPage });
                setSize(nextSize);
              },
            }}
          />
        )}
      </Panel>
    </>
  );
}
