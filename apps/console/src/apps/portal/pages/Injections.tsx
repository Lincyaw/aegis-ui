import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  EmptyState,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useInjectionsList } from '../api/injections';
import { StatusChip } from '../components/StatusChip';
import { useActiveProjectIdNum } from '../hooks/useActiveProject';
import { useInjectBatch } from '../state/inject-batch';

interface InjectionRow {
  id: number;
  name: string;
  faultType: string;
  status: string;
  createdAt: string;
}

export default function Injections() {
  const projectId = useActiveProjectIdNum();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();

  const { data, isLoading, isError, error } = useInjectionsList(projectId);
  const stagedCount = useInjectBatch((s) => s.staged.length);

  const rows = useMemo<InjectionRow[]>(
    () =>
      (data ?? []).map((i) => ({
        id: i.id ?? 0,
        name: i.name ?? '',
        faultType: i.fault_type ?? '',
        status: i.status ?? i.state ?? 'unknown',
        createdAt: i.created_at ?? '',
      })),
    [data]
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number): void => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Injections'
        description={`Fault injections for project ${projectId}.`}
        action={
          <div className='page-action-row'>
            {stagedCount > 0 && (
              <Button
                tone='secondary'
                onClick={() => navigate('injections/batch')}
              >
                Batch ({stagedCount})
              </Button>
            )}
            <Button tone='primary' onClick={() => navigate('injections/new')}>
              + Inject
            </Button>
          </div>
        }
      />

      {selected.size > 0 && (
        <div className='page-bulk-bar'>
          <span>{selected.size} selected</span>
          <div className='page-bulk-bar__actions'>
            <Button
              tone='ghost'
              onClick={() => {
                void msg.info('Dataset attach not yet wired to portal API');
              }}
            >
              Add to dataset
            </Button>
            <Button tone='ghost' onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <Panel>
        {isError ? (
          <EmptyState
            title='Failed to load injections'
            description={
              error instanceof Error ? error.message : 'Unknown error'
            }
          />
        ) : (
          <DataTable<InjectionRow>
            data={rows}
            rowKey={(r) => String(r.id)}
            loading={isLoading}
            emptyTitle='No injections'
            emptyDescription='Click + Inject to create one.'
            columns={[
              {
                key: 'sel',
                header: '',
                render: (r) => (
                  <input
                    type='checkbox'
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`select ${r.id}`}
                  />
                ),
              },
              {
                key: 'id',
                header: 'Injection',
                render: (r) => (
                  <Link to={href(`injections/${r.id}`)}>
                    <MonoValue size='sm'>{r.id}</MonoValue>
                  </Link>
                ),
              },
              { key: 'name', header: 'Name', render: (r) => r.name },
              {
                key: 'fault',
                header: 'Fault',
                render: (r) => <MonoValue size='sm'>{r.faultType}</MonoValue>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <StatusChip status={r.status} />,
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) => <TimeDisplay value={r.createdAt} />,
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
