import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
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
import { humanBytes, visibilityTone } from './helpers';

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
            `Delete failed: ${e instanceof Error ? e.message : 'unknown'}`,
          );
        }
      },
    });
  };

  return (
    <span className='pages-app__row-actions'>
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
    </span>
  );
}

export default function PagesList() {
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  const { size, setSize } = usePageSize('pages:mine', 20);
  const { data, isLoading, error, refetch } = usePagesList({ limit: size });

  const columns = useMemo<Array<DataTableColumn<PagesPageSiteResponse>>>(
    () => [
      {
        key: 'slug',
        header: 'Slug',
        render: (row) => (
          <Link to={`${basePath}/${(row.id ?? '').toString()}`}>
            <MonoValue size='sm'>{row.slug ?? '—'}</MonoValue>
          </Link>
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
        key: 'actions',
        header: '',
        align: 'right',
        truncate: false,
        width: 160,
        render: (row) => <RowActions row={row} />,
      },
    ],
    [basePath],
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
      ) : !isLoading && items.length === 0 ? (
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
