import { useMemo, useState } from 'react';

import { ExportOutlined } from '@ant-design/icons';
import {
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

import { usePageSize } from '../../portal/hooks/usePageSize';
import { shareUrlForSlug, usePagesPublic } from '../api/pages-client';
import '../pages-app.css';

import { pageColumns } from './helpers';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function PagesPublic() {
  const { size, setSize } = usePageSize('pages:public', 20);
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = usePagesPublic({
    limit: size,
    offset: (page - 1) * size,
  });

  const columns = useMemo(
    () =>
      pageColumns(
        (row) => (
          <a
            href={shareUrlForSlug(row.slug ?? '')}
            target='_blank'
            rel='noopener noreferrer'
          >
            <MonoValue size='sm'>{row.slug ?? '—'}</MonoValue>
          </a>
        ),
        {
          key: 'open',
          header: '',
          kind: 'actions',
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
        }
      ),
    []
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
      ) : !isLoading && items.length === 0 && page === 1 ? (
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
            pagination={{
              page,
              pageSize: size,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setSize(nextSize);
              },
            }}
          />
        </Panel>
      )}
    </>
  );
}
