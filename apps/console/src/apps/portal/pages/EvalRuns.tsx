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
import type { EvaluationEvaluationResp } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { useDeleteEvaluation, useEvaluations } from '../api/evaluations';
import { DeleteButton } from '../components/DeleteButton';
import { LoadError } from '../components/LoadError';
import { usePageSize } from '../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function EvalRuns() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();
  const { size, setSize } = usePageSize('eval', 20);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useEvaluations(page, size);
  const del = useDeleteEvaluation();

  return (
    <>
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
        {isError ? (
          <LoadError error={error} title='Failed to load evaluations' />
        ) : (
          <DataTable<EvaluationEvaluationResp>
            framed={false}
            loading={isLoading}
            emptyTitle='No evaluations yet'
            emptyDescription='Kick off a run to see results here.'
            data={data?.items ?? []}
            rowKey={(r) => r.id ?? -1}
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
                  <MonoValue size='sm'>
                    {r.f1_score === undefined ? '—' : r.f1_score.toFixed(3)}
                  </MonoValue>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) =>
                  r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <DeleteButton
                    subject={`evaluation ${String(r.id)}`}
                    disabled={r.id === undefined}
                    onDelete={async () => {
                      if (r.id === undefined) {
                        return;
                      }
                      await del.mutateAsync(r.id);
                      void msg.success(`Deleted evaluation ${String(r.id)}`);
                    }}
                  />
                ),
              },
            ]}
            pagination={{
              page,
              pageSize: size,
              total: data?.total,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setSize(nextSize);
              },
            }}
          />
        )}
      </Panel>
    </>
  );
}
