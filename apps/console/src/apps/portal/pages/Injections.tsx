import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  Toolbar,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import type { InjectionInjectionResp } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useDeleteInjections, useInjectionsList } from '../api/injections';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadError } from '../components/LoadError';
import { ProjectRequired } from '../components/ProjectRequired';
import { StatusChip } from '../components/StatusChip';
import { useActiveProject } from '../hooks/useActiveProject';
import { usePageSize } from '../hooks/usePageSize';
import { useInjectBatch } from '../state/inject-batch';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ListView {
  projectId: number | undefined;
  page: number;
  selected: Array<string | number>;
}

function plural(count: number): string {
  return `${String(count)} injection${count === 1 ? '' : 's'}`;
}

export default function Injections() {
  const active = useActiveProject();
  const { projectId } = active;
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();

  const { size, setSize } = usePageSize('injections', 50);
  const [stored, setView] = useState<ListView>({
    projectId,
    page: 1,
    selected: [],
  });
  const view: ListView =
    stored.projectId === projectId
      ? stored
      : { projectId, page: 1, selected: [] };
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const list = useInjectionsList(projectId, view.page, size);
  const deleteMutation = useDeleteInjections();
  const stagedCount = useInjectBatch((s) => s.staged.length);

  const select = (selected: Array<string | number>): void => {
    setView({ ...view, selected });
  };

  const deleteSelected = (): void => {
    const ids = view.selected.map(Number);
    deleteMutation.mutate(ids, {
      onSuccess: () => {
        void msg.success(`${plural(ids.length)} deleted`);
        setConfirmingDelete(false);
        select([]);
      },
      onError: (err) => {
        setConfirmingDelete(false);
        void msg.error(`Delete failed: ${errMsg(err)}`);
      },
    });
  };

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
          <>
            {view.selected.length > 0 && (
              <Toolbar
                left={
                  <MonoValue size='sm'>{`${String(view.selected.length)} selected`}</MonoValue>
                }
                right={
                  <div className='page-action-row'>
                    <Button tone='ghost' onClick={() => select([])}>
                      Clear
                    </Button>
                    <Button
                      tone='secondary'
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete selected
                    </Button>
                  </div>
                }
              />
            )}
            <DataTable<InjectionInjectionResp>
              framed={false}
              data={list.data?.items ?? []}
              rowKey={(r) => r.id ?? -1}
              loading={list.isLoading}
              selectable
              selectedKeys={view.selected}
              onSelectedKeysChange={select}
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
                  key: 'status',
                  header: 'Status',
                  render: (r) => <StatusChip status={r.status ?? r.state} />,
                },
                {
                  key: 'created',
                  header: 'Created',
                  render: (r) =>
                    r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
                },
              ]}
              pagination={{
                page: view.page,
                pageSize: size,
                total: list.data?.total,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onChange: (page, nextSize) => {
                  setView({ projectId, page, selected: [] });
                  setSize(nextSize);
                },
              }}
            />
          </>
        )}
      </Panel>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${plural(view.selected.length)}?`}
        description='This cannot be undone.'
        confirmLabel='Delete'
        pending={deleteMutation.isPending}
        onConfirm={deleteSelected}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
