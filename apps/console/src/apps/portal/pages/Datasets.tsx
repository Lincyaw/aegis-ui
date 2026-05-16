import { Spin } from 'antd';
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
import type { DatasetDatasetResp } from '@lincyaw/portal';

import { useDatasetsList } from '../api/datasets';

export default function Datasets() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading, isError, error } = useDatasetsList({ page: 1, size: 50 });
  const datasets = data?.items ?? [];

  return (
    <div className='page-wrapper'>
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
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <Spin />
          </div>
        ) : isError ? (
          <ErrorState
            title='Failed to load datasets'
            description={error instanceof Error ? error.message : 'Unknown error'}
          />
        ) : datasets.length === 0 ? (
          <EmptyState
            title='No datasets'
            description='Build a dataset from the Injections list.'
          />
        ) : (
          <DataTable<DatasetDatasetResp>
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
              { key: 'status', header: 'Status', render: (r) => r.status ?? '—' },
              {
                key: 'created',
                header: 'Created',
                render: (r) =>
                  r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
