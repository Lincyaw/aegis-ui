import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { ExecutionExecutionResp } from '@lincyaw/portal';

import { useExecutionsList } from '../api/executions';
import { LoadError } from '../components/LoadError';
import { ProjectRequired } from '../components/ProjectRequired';
import { StatusChip } from '../components/StatusChip';
import { useActiveProject } from '../hooks/useActiveProject';
import { usePageSize } from '../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Executions() {
  const active = useActiveProject();
  const { projectId } = active;
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { size, setSize } = usePageSize('executions', 20);
  // Switching the active project starts again from the first page.
  const [paging, setPaging] = useState({ projectId, page: 1 });
  const page = paging.projectId === projectId ? paging.page : 1;
  const { data, isLoading, isError, error } = useExecutionsList(
    projectId,
    page,
    size
  );

  const header = (
    <PageHeader
      title='Executions'
      description={
        active.project?.name === undefined
          ? 'Algorithm and eval executions.'
          : `Algorithm and eval executions in ${active.project.name}.`
      }
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
  );

  if (projectId === undefined) {
    return (
      <>
        {header}
        <ProjectRequired active={active} />
      </>
    );
  }

  return (
    <>
      {header}
      <Panel>
        {isError ? (
          <LoadError error={error} title='Failed to load executions' />
        ) : (
          <DataTable<ExecutionExecutionResp>
            framed={false}
            loading={isLoading}
            emptyTitle='No executions'
            emptyDescription='Run an algorithm to see results here.'
            data={data?.items ?? []}
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
                render: (r) => <StatusChip status={r.state ?? r.status} />,
              },
              {
                key: 'started',
                header: 'Created',
                render: (r) =>
                  r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
              },
            ]}
            pagination={{
              page,
              pageSize: size,
              total: data?.total,
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
