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
import type { InjectionInjectionResp } from '@lincyaw/portal';

import { useInjectionsList } from '../api/injections';
import { LoadError } from '../components/LoadError';
import { ProjectRequired } from '../components/ProjectRequired';
import { StatusChip } from '../components/StatusChip';
import { useActiveProject } from '../hooks/useActiveProject';
import { usePageSize } from '../hooks/usePageSize';
import { useInjectBatch } from '../state/inject-batch';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Injections() {
  const active = useActiveProject();
  const { projectId } = active;
  const navigate = useAppNavigate();
  const href = useAppHref();

  const { size, setSize } = usePageSize('injections', 50);
  // Switching the active project starts again from the first page.
  const [paging, setPaging] = useState({ projectId, page: 1 });
  const page = paging.projectId === projectId ? paging.page : 1;

  const list = useInjectionsList(projectId, page, size);
  const stagedCount = useInjectBatch((s) => s.staged.length);

  const header = (
    <PageHeader
      title='Injections'
      description={
        active.project?.name === undefined
          ? 'Fault injections.'
          : `Fault injections in ${active.project.name}.`
      }
      action={
        <div className='page-action-row'>
          {stagedCount > 0 && (
            <Button
              tone='secondary'
              onClick={() => navigate('injections/batch')}
            >
              {`Batch (${String(stagedCount)})`}
            </Button>
          )}
          <Button tone='primary' onClick={() => navigate('injections/new')}>
            + Inject
          </Button>
        </div>
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
      <Panel padded={false}>
        {list.isError ? (
          <LoadError error={list.error} title='Failed to load injections' />
        ) : (
          <DataTable<InjectionInjectionResp>
            framed={false}
            data={list.data?.items ?? []}
            rowKey={(r) => r.id ?? -1}
            loading={list.isLoading}
            emptyTitle='No injections'
            emptyDescription='Click + Inject to create one.'
            columns={[
              {
                key: 'id',
                header: 'Injection',
                render: (r) => (
                  <Link to={href(`injections/${String(r.id)}`)}>
                    <MonoValue size='sm'>{r.id}</MonoValue>
                  </Link>
                ),
              },
              { key: 'name', header: 'Name', render: (r) => r.name },
              {
                key: 'fault',
                header: 'Fault',
                render: (r) => (
                  <MonoValue size='sm'>{r.fault_type ?? '—'}</MonoValue>
                ),
              },
              {
                key: 'state',
                header: 'State',
                render: (r) => <StatusChip status={r.state} />,
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) =>
                  r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
              },
            ]}
            pagination={{
              page,
              pageSize: size,
              total: list.data?.total,
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
