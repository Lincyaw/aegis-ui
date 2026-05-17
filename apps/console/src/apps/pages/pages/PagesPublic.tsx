import { useMemo } from 'react';

import { ExportOutlined } from '@ant-design/icons';
import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  PageSizeSelect,
  Panel,
} from '@lincyaw/aegis-ui';
import type { PagesPageSiteResponse } from '@lincyaw/portal';
import { Button } from 'antd';

import { usePageSize } from '../../portal/hooks/usePageSize';
import { shareUrlForSlug, usePagesPublic } from '../api/pages-client';
import '../pages-app.css';
import { humanBytes, visibilityTone } from './helpers';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function PagesPublic() {
  const { size, setSize } = usePageSize('pages:public', 20);
  const { data, isLoading, error, refetch } = usePagesPublic({ limit: size });

  const columns = useMemo<Array<DataTableColumn<PagesPageSiteResponse>>>(
    () => [
      {
        key: 'slug',
        header: 'Slug',
        render: (row) => (
          <a
            href={shareUrlForSlug(row.slug ?? '')}
            target='_blank'
            rel='noopener noreferrer'
          >
            <MonoValue size='sm'>{row.slug ?? '—'}</MonoValue>
          </a>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        render: (row) =>
          row.title !== undefined && row.title !== '' ? (
            row.title
          ) : (
            <span className='pages-app__muted'>—</span>
          ),
      },
      {
        key: 'visibility',
        header: 'Visibility',
        width: 140,
        render: (row) => (
          <Chip tone={visibilityTone(row.visibility)}>
            {row.visibility ?? '—'}
          </Chip>
        ),
      },
      {
        key: 'files',
        header: 'Files',
        align: 'right',
        width: 80,
        render: (row) => (
          <MonoValue size='sm'>{(row.file_count ?? 0).toString()}</MonoValue>
        ),
      },
      {
        key: 'size',
        header: 'Size',
        align: 'right',
        width: 100,
        render: (row) => (
          <MonoValue size='sm'>{humanBytes(row.size_bytes ?? 0)}</MonoValue>
        ),
      },
      {
        key: 'updated',
        header: 'Updated',
        width: 180,
        render: (row) => (
          <MonoValue size='sm'>
            {row.updated_at !== undefined && row.updated_at !== ''
              ? new Date(row.updated_at).toLocaleString()
              : '—'}
          </MonoValue>
        ),
      },
      {
        key: 'open',
        header: '',
        align: 'right',
        truncate: false,
        width: 80,
        render: (row) => (
          <Button
            size='small'
            type='text'
            icon={<ExportOutlined />}
            title='Open share link'
            onClick={() => {
              if (row.slug !== undefined && row.slug !== '') {
                window.open(shareUrlForSlug(row.slug), '_blank', 'noopener');
              }
            }}
          />
        ),
      },
    ],
    [],
  );

  const items = data ?? [];

  return (
    <>
      <PageHeader
        title='Public pages'
        description='Listed pages other users have published. Open one to view the rendered site.'
      />

      {error ? (
        <Panel>
          <ErrorState
            title='Could not list public pages'
            description={error instanceof Error ? error.message : 'unknown'}
            action={
              <Button
                onClick={() => {
                  void refetch();
                }}
              >
                Retry
              </Button>
            }
          />
        </Panel>
      ) : !isLoading && items.length === 0 ? (
        <Panel>
          <EmptyState
            title='Nothing listed yet'
            description='No one has published a public page.'
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <DataTable
            columns={columns}
            data={items}
            rowKey={(row) => row.id ?? ''}
            loading={isLoading}
          />
          <div className='page-table-footer'>
            <PageSizeSelect
              value={size}
              onChange={setSize}
              options={PAGE_SIZE_OPTIONS}
            />
          </div>
        </Panel>
      )}
    </>
  );
}
