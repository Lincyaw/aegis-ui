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
import type { DatasetDatasetResp } from '@lincyaw/portal';

import { errMsg } from '../../../api/apiClient';
import { useDatasetsList } from '../api/datasets';
import { usePageSize } from '../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Datasets() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { size, setSize } = usePageSize('datasets', 50);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useDatasetsList({ page, size });
  const datasets = data?.items ?? [];

  return (
    <>
      <PageHeader
        title='Datasets'
        description='Curated bundles of injections + traces for replay & eval.'
        action={
          <Button tone='primary' onClick={() => navigate('datasets/new')}>
            + New dataset
          </Button>
        }
      />
      <Panel>
        {isError ? (
          <ErrorState
            title='Failed to load datasets'
            description={errMsg(error, 'Unknown error')}
          />
        ) : (
          <DataTable<DatasetDatasetResp>
            loading={isLoading}
            emptyTitle='No datasets'
            emptyDescription='Build a dataset from the Injections list.'
            data={datasets}
            rowKey={(r) => String(r.id ?? '')}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r) => (
                  <Link to={href(`datasets/${String(r.id ?? '')}`)}>
                    <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                  </Link>
                ),
              },
              { key: 'type', header: 'Type', render: (r) => r.type ?? '—' },
              {
                key: 'visibility',
                header: 'Visibility',
                render: (r) => (r.is_public ? 'public' : 'private'),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => r.status ?? '—',
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
              total: data?.pagination?.total,
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
