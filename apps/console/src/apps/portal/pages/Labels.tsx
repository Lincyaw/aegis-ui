import { Spin } from 'antd';
import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
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
import type { LabelLabelResp } from '@lincyaw/portal';

import { useLabelsList } from '../api/labels';

export default function Labels() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading, isError, error } = useLabelsList({ page: 1, size: 50 });
  const labels = data?.items ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Labels'
        description='Organize and filter resources with custom labels.'
        action={
          <Button tone='primary' onClick={() => navigate('labels/new')}>
            + New label
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
            title='Failed to load labels'
            description={error instanceof Error ? error.message : 'Unknown error'}
          />
        ) : labels.length === 0 ? (
          <EmptyState title='No labels' description='Create your first label.' />
        ) : (
          <DataTable<LabelLabelResp>
            data={labels}
            rowKey={(r) => String(r.id ?? '')}
            columns={[
              {
                key: 'key',
                header: 'Key',
                render: (r) => (
                  <Link to={href(`labels/${String(r.id ?? '')}`)}>
                    <MonoValue size='sm'>{r.key ?? '—'}</MonoValue>
                  </Link>
                ),
              },
              {
                key: 'value',
                header: 'Value',
                render: (r) => <MonoValue size='sm'>{r.value ?? '—'}</MonoValue>,
              },
              {
                key: 'category',
                header: 'Category',
                render: (r) => <Chip tone='ghost'>{r.category ?? '—'}</Chip>,
              },
              {
                key: 'system',
                header: 'System',
                render: (r) => (r.is_system ? 'yes' : 'no'),
              },
              {
                key: 'usage',
                header: 'Uses',
                render: (r) => <MonoValue size='sm'>{r.usage ?? 0}</MonoValue>,
              },
              {
                key: 'created',
                header: 'Created',
                render: (r) => (r.created_at ? <TimeDisplay value={r.created_at} /> : '—'),
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
