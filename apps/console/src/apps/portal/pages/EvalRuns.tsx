import { useState } from 'react';
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

import {
  type EvaluationResp,
  useDeleteEvaluation,
  useEvaluations,
} from '../api/hooks/useEvaluations';

const PAGE_SIZE = 20;

export default function EvalRuns() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useEvaluations({
    page,
    size: PAGE_SIZE,
  });
  const del = useDeleteEvaluation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='LLM evaluations'
        description='Algorithm evaluation runs.'
        action={
          <Button tone='primary' onClick={() => navigate('eval/new')}>
            + New run
          </Button>
        }
      />
      <Panel>
        {isLoading ? (
          <EmptyState title='Loading evaluations…' />
        ) : isError ? (
          <EmptyState
            title='Failed to load evaluations'
            description={
              error instanceof Error ? error.message : 'Unknown error'
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title='No evaluations yet'
            description='Kick off a run to see results here.'
          />
        ) : (
          <DataTable<EvaluationResp>
            data={items}
            rowKey={(r) => String(r.id)}
            columns={[
              {
                key: 'id',
                header: 'Run',
                render: (r) => (
                  <Link to={href(`eval/${String(r.id)}`)}>
                    <MonoValue size='sm'>{String(r.id)}</MonoValue>
                  </Link>
                ),
              },
              {
                key: 'algo',
                header: 'Algorithm',
                render: (r) => (
                  <MonoValue size='sm'>
                    {r.algorithm_name}
                    {r.algorithm_version ? `@${r.algorithm_version}` : ''}
                  </MonoValue>
                ),
              },
              {
                key: 'ds',
                header: 'Dataset / Datapack',
                render: (r) => (
                  <MonoValue size='sm'>
                    {r.dataset_name
                      ? `${r.dataset_name}${r.dataset_version ? `@${r.dataset_version}` : ''}`
                      : (r.datapack_name ?? '—')}
                  </MonoValue>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (r) => <MonoValue size='sm'>{r.eval_type}</MonoValue>,
              },
              {
                key: 'f1',
                header: 'F1',
                render: (r) => (
                  <MonoValue size='sm'>{r.f1_score.toFixed(3)}</MonoValue>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) => <TimeDisplay value={r.created_at} />,
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <Button
                    tone='secondary'
                    onClick={() => {
                      del.mutate(r.id, {
                        onSuccess: () =>
                          void msg.success(`Deleted ${String(r.id)}`),
                        onError: (e) => void msg.error(e.message),
                      });
                    }}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Panel>
      {total > PAGE_SIZE ? (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            tone='secondary'
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            tone='secondary'
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
