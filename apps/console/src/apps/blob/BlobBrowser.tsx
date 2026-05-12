import { useCallback, useEffect, useMemo, useState } from 'react';

import { DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Drawer, Select } from 'antd';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FileDropzone,
  type FileDropzoneItem,
  FilePreview,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  ParquetViewer,
} from '@lincyaw/aegis-ui';

import { ApiError } from '../../api/apiClient';
import {
  type BucketSummary,
  deleteObject,
  inlineUrl,
  listBuckets,
  listObjects,
  type ObjectRow,
  presignPut,
  uploadWithPresign,
} from '../../api/blobClient';

const PARQUET_RE = /\.parquet$/i;

function isParquet(row: ObjectRow): boolean {
  return (
    PARQUET_RE.test(row.StorageKey) ||
    row.ContentType === 'application/parquet' ||
    row.ContentType === 'application/x-parquet'
  );
}

function inferMime(row: ObjectRow): string | undefined {
  if (row.ContentType && row.ContentType !== 'application/octet-stream') {
    return row.ContentType;
  }
  if (isParquet(row)) {
    return 'application/x-parquet';
  }
  return undefined;
}

function humanBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i] ?? ''}`;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

export default function BlobBrowser() {
  const { message: msg, modal } = AntdApp.useApp();
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [bucket, setBucket] = useState<string>('');
  const [rows, setRows] = useState<ObjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<FileDropzoneItem[]>([]);
  const [preview, setPreview] = useState<ObjectRow | null>(null);

  useEffect(() => {
    const cancelled = { value: false };
    void (async () => {
      try {
        const items = await listBuckets();
        if (cancelled.value) {
          return;
        }
        setBuckets(items);
        if (items.length > 0 && bucket === '') {
          setBucket(items[0]?.name ?? '');
        }
      } catch (e) {
        if (!cancelled.value) {
          setError(errMsg(e));
        }
      }
    })();
    return () => {
      cancelled.value = true;
    };
    // Only run once on mount; subsequent re-fetches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (bucket === '') {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listObjects(bucket, { limit: 100 });
      setRows(res.items);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDrop = useCallback(
    async (files: File[]): Promise<void> => {
      const queued: FileDropzoneItem[] = files.map((f) => ({
        id: `${f.name}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        status: 'queued',
      }));
      setUploads((prev) => [...queued, ...prev]);

      for (const item of queued) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id ? { ...u, status: 'uploading' } : u,
          ),
        );
        try {
          const presign = await presignPut(bucket, {
            key: item.file.name,
            content_type: item.file.type || 'application/octet-stream',
            content_length: item.file.size,
            ttl_seconds: 300,
          });
          await uploadWithPresign(presign.presigned, item.file);
          setUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: 'done' } : u)),
          );
        } catch (e) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? { ...u, status: 'error', error: errMsg(e) }
                : u,
            ),
          );
        }
      }
      await refresh();
    },
    [bucket, refresh],
  );

  const handleDelete = useCallback(
    (row: ObjectRow) => {
      modal.confirm({
        title: `Delete "${row.StorageKey}"?`,
        content: `Removes the object from bucket "${row.Bucket}" immediately.`,
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteObject(row.Bucket, row.StorageKey);
            void msg.success('Deleted');
            await refresh();
          } catch (e) {
            void msg.error(`Delete failed: ${errMsg(e)}`);
          }
        },
      });
    },
    [msg, modal, refresh],
  );

  const columns = useMemo<Array<DataTableColumn<ObjectRow>>>(
    () => [
      {
        key: 'key',
        header: 'Key',
        render: (row) => <MonoValue size='sm'>{row.StorageKey}</MonoValue>,
      },
      {
        key: 'size',
        header: 'Size',
        align: 'right',
        render: (row) => (
          <MonoValue size='sm'>{humanBytes(row.SizeBytes)}</MonoValue>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row) =>
          row.ContentType ? (
            <Chip tone='ghost'>{row.ContentType}</Chip>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
      {
        key: 'entity',
        header: 'Entity',
        render: (row) =>
          row.EntityKind ? (
            <MonoValue size='sm'>
              {row.EntityKind}/{row.EntityID}
            </MonoValue>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
      {
        key: 'created',
        header: 'Created',
        render: (row) => (
          <MonoValue size='sm'>
            {new Date(row.CreatedAt).toLocaleString()}
          </MonoValue>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (row) => (
          <span style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button
              size='small'
              type='text'
              icon={<EyeOutlined />}
              onClick={() => {
                setPreview(row);
              }}
            >
              Preview
            </Button>
            <Button
              size='small'
              type='text'
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                handleDelete(row);
              }}
            />
          </span>
        ),
      },
    ],
    [handleDelete],
  );

  return (
    <>
      <PageHeader
        title='Blob storage'
        description='Browse objects in aegis-blob buckets. Upload, preview, delete.'
        action={
          <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Select
              value={bucket}
              onChange={setBucket}
              options={buckets.map((b) => ({ value: b.name, label: b.name }))}
              placeholder={
                buckets.length === 0 ? 'No buckets configured' : 'Pick a bucket'
              }
              disabled={buckets.length === 0}
              style={{ width: 200 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void refresh();
              }}
            >
              Refresh
            </Button>
          </span>
        }
      />

      <Panel>
        <PanelTitle>Upload</PanelTitle>
        <FileDropzone
          items={uploads}
          onDrop={(files) => {
            void handleDrop(files);
          }}
          multiple
          hint={`Drop files into bucket "${bucket}". Uses presign-put + direct PUT.`}
        />
      </Panel>

      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not list objects'
            description={error}
            action={
              <Button
                onClick={() => {
                  void refresh();
                }}
              >
                Try again
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.ID.toString()}
            loading={loading}
            emptyTitle='Bucket is empty'
            emptyDescription='Drop a file above to upload your first object.'
          />
          {!loading && rows.length === 0 ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <EmptyState
                title='Bucket is empty'
                description={`No objects in "${bucket}" yet.`}
              />
            </div>
          ) : null}
        </Panel>
      )}

      <Drawer
        title={preview?.StorageKey ?? 'Preview'}
        open={preview !== null}
        onClose={() => {
          setPreview(null);
        }}
        width={720}
        destroyOnClose
      >
        {preview ? (
          isParquet(preview) ? (
            <ParquetViewer
              src={inlineUrl(preview.Bucket, preview.StorageKey)}
              title={preview.StorageKey}
            />
          ) : (
            <FilePreview
              src={inlineUrl(preview.Bucket, preview.StorageKey)}
              mimeType={inferMime(preview)}
              name={preview.StorageKey}
              size={preview.SizeBytes}
            />
          )
        ) : null}
      </Drawer>
    </>
  );
}
