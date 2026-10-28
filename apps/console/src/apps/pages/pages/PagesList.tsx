import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  DataTable,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  Toolbar,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import type { PagesPageSiteResponse } from '@lincyaw/portal';
import { App as AntdApp, Button } from 'antd';

import { usePageSize } from '../../portal/hooks/usePageSize';
import {
  shareUrlForSlug,
  useDeletePage,
  usePagesList,
} from '../api/pages-client';
import '../pages-app.css';

import { pageColumns } from './helpers';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function RowActions({ row }: { row: PagesPageSiteResponse }) {
  const { message: msg, modal } = AntdApp.useApp();
  const del = useDeletePage();

  const onOpen = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (row.slug !== undefined && row.slug !== '') {
      window.open(shareUrlForSlug(row.slug), '_blank', 'noopener');
    }
  };

  const onDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    const id = row.id;
    if (id === undefined) {
      return;
    }
    modal.confirm({
      title: `Delete "${row.slug ?? ''}"?`,
      content:
        'Permanently removes the site and all of its files. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del.mutateAsync(id);
          void msg.success('Deleted');
        } catch (e) {
          void msg.error(
            `Delete failed: ${e instanceof Error ? e.message : 'unknown'}`
          );
        }
      },
    });
  };

  return (
    <>
      <Button
        size='small'
        type='text'
        icon={<ExportOutlined />}
        title='Open share link'
        onClick={onOpen}
      />
      <Button
        size='small'
        type='text'
        danger
        icon={<DeleteOutlined />}
        title='Delete'
        onClick={onDelete}
      />
    </>
  );
}

export default function PagesList() {
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  const { size, setSize } = usePageSize('pages:mine', 20);
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = usePagesList({
    limit: size,
    offset: (page - 1) * size,
  });

  const columns = useMemo(
    () =>
      pageColumns(
        (row) => (
          <Link to={`${basePath}/${(row.id ?? '').toString()}`}>
            <MonoValue size='sm'>{row.slug ?? '—'}</MonoValue>
          </Link>
        ),
        {
          key: 'actions',
          header: '',
          kind: 'actions',
          width: 160,
          render: (row) => <RowActions row={row} />,
        }
      ),
    [basePath]
  );

  const items = data ?? [];

  return (
    <>
      <PageHeader
        title='My pages'
        description='Static sites you own. Upload a folder of markdown and share the URL.'
      />

      <Toolbar
        right={
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              navigate(`${basePath}/new`);
            }}
          >
            New page
          </Button>
        }
      />

      {error ? (
        <Panel>
          <ErrorState
            title='Could not list pages'
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
            title='No pages yet'
            description='Click "New page" to upload your first static site.'
            action={
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => {
                  navigate(`${basePath}/new`);
                }}
              >
                New page
              </Button>
            }
          />
        </Panel>
      ) : (
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
      )}
    </>
  );
}
