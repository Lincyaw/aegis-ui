import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, Drawer } from 'antd';

import {
  Breadcrumb,
  type BreadcrumbItem,
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FileDropzone,
  type FileDropzoneItem,
  FilePreview,
  MonoValue,
  ObjectBrowser,
  PageHeader,
  Panel,
  PanelTitle,
  ParquetViewer,
  ShareLinkDialog,
  type ShareLinkResult,
  UploadQueue,
  useActiveApp,
} from '@lincyaw/aegis-ui';

import { ApiError } from '../../../api/apiClient';
import {
  deleteObject,
  driverList,
  type DriverListResult,
  inlineUrl,
  presignGet,
  presignPut,
  recordShare,
  uploadWithPresign,
} from '../../../api/blobClient';

interface ObjItem {
  key: string;
  size: number;
  contentType?: string;
  updatedAt: string;
}

const PARQUET_RE = /\.parquet$/i;

function isParquet(item: ObjItem): boolean {
  return (
    PARQUET_RE.test(item.key) ||
    item.contentType === 'application/parquet' ||
    item.contentType === 'application/x-parquet'
  );
}

function inferMime(item: ObjItem): string | undefined {
  if (item.contentType && item.contentType !== 'application/octet-stream') {
    return item.contentType;
  }
  if (isParquet(item)) {
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

const RouterLink: React.ComponentType<{
  to: string;
  className?: string;
  children: React.ReactNode;
}> = ({ to, className, children }) => (
  <Link to={to} className={className}>
    {children}
  </Link>
);

function lastSegment(key: string): string {
  const idx = key.lastIndexOf('/');
  return idx === -1 ? key : key.slice(idx + 1);
}

export default function BucketBrowser() {
  const { bucket: bucketParam = '' } = useParams<{ bucket: string }>();
  const bucket = decodeURIComponent(bucketParam);
  const { basePath } = useActiveApp();
  const navigate = useNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const [prefix, setPrefix] = useState('');
  const [result, setResult] = useState<DriverListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<FileDropzoneItem[]>([]);
  const [preview, setPreview] = useState<ObjItem | null>(null);
  const [share, setShare] = useState<ObjItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refresh = useCallback(async (): Promise<void> => {
    if (bucket === '') {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await driverList(bucket, {
        prefix,
        delimiter: '/',
        max_keys: 200,
      });
      setResult(res);
      setSelected(new Set());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [bucket, prefix]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items: ObjItem[] = useMemo(() => {
    if (!result) {
      return [];
    }
    return result.items.map((it) => ({
      key: it.key,
      size: it.size_bytes,
      contentType: it.content_type,
      updatedAt: it.updated_at,
    }));
  }, [result]);

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
            key: prefix + item.file.name,
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
    [bucket, prefix, refresh],
  );

  const handleDelete = useCallback(
    (item: ObjItem) => {
      modal.confirm({
        title: `Delete "${item.key}"?`,
        content: `Removes the object from "${bucket}" immediately.`,
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteObject(bucket, item.key);
            void msg.success('Deleted');
            await refresh();
          } catch (e) {
            void msg.error(`Delete failed: ${errMsg(e)}`);
          }
        },
      });
    },
    [bucket, msg, modal, refresh],
  );

  const handleBulkDelete = useCallback(() => {
    if (selected.size === 0) {
      return;
    }
    modal.confirm({
      title: `Delete ${selected.size.toString()} objects?`,
      content: 'This cannot be undone.',
      okText: 'Delete all',
      okButtonProps: { danger: true },
      onOk: async () => {
        const keys = Array.from(selected);
        await Promise.allSettled(keys.map((k) => deleteObject(bucket, k)));
        void msg.success(`Deleted ${keys.length.toString()} objects`);
        await refresh();
      },
    });
  }, [bucket, modal, msg, refresh, selected]);

  const generateShareLink = useCallback(
    async (item: ObjItem, opts: { ttlSeconds: number; asAttachment: boolean }): Promise<ShareLinkResult> => {
      const filename = lastSegment(item.key);
      const pr = await presignGet(bucket, {
        key: item.key,
        ttl_seconds: opts.ttlSeconds,
        response_content_type: opts.asAttachment
          ? `application/octet-stream; disposition=attachment; filename="${filename}"`
          : undefined,
      });
      const fullUrl = pr.url.startsWith('http')
        ? pr.url
        : `${window.location.origin}${pr.url}`;
      const out: ShareLinkResult = {
        url: fullUrl,
        expiresAt: pr.expires_at,
      };
      recordShare({
        id: `${bucket}:${item.key}:${Date.now().toString()}`,
        bucket,
        key: item.key,
        url: fullUrl,
        expiresAt: pr.expires_at,
        createdAt: new Date().toISOString(),
        asAttachment: opts.asAttachment,
      });
      return out;
    },
    [bucket],
  );

  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const out: BreadcrumbItem[] = [
      { label: 'Buckets', to: basePath },
      { label: bucket, to: prefix === '' ? undefined : `${basePath}/${encodeURIComponent(bucket)}` },
    ];
    if (prefix !== '') {
      const segs = prefix.split('/').filter(Boolean);
      let acc = '';
      segs.forEach((seg, i) => {
        acc += `${seg}/`;
        const isLast = i === segs.length - 1;
        out.push({ label: seg, to: isLast ? undefined : `${basePath}/${encodeURIComponent(bucket)}?prefix=${encodeURIComponent(acc)}` });
      });
    }
    return out;
  }, [basePath, bucket, prefix]);

  const columns = useMemo<Array<DataTableColumn<ObjItem>>>(
    () => [
      {
        key: 'sel',
        header: '',
        width: 32,
        truncate: false,
        render: (row) => (
          <input
            type="checkbox"
            checked={selected.has(row.key)}
            onChange={(e) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (e.target.checked) {
                  next.add(row.key);
                } else {
                  next.delete(row.key);
                }
                return next;
              });
            }}
          />
        ),
      },
      {
        key: 'key',
        header: 'Name',
        render: (row) => <MonoValue size="sm">{lastSegment(row.key)}</MonoValue>,
      },
      {
        key: 'size',
        header: 'Size',
        align: 'right',
        width: 100,
        render: (row) => <MonoValue size="sm">{humanBytes(row.size)}</MonoValue>,
      },
      {
        key: 'type',
        header: 'Type',
        width: 200,
        render: (row) =>
          row.contentType ? (
            <Chip tone="ghost">{row.contentType}</Chip>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
      {
        key: 'updated',
        header: 'Updated',
        width: 180,
        render: (row) => (
          <MonoValue size="sm">{new Date(row.updatedAt).toLocaleString()}</MonoValue>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        truncate: false,
        width: 160,
        render: (row) => (
          <span style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setPreview(row);
              }}
              title="Preview"
            />
            <Button
              size="small"
              type="text"
              icon={<ShareAltOutlined />}
              onClick={() => {
                setShare(row);
              }}
              title="Share"
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                handleDelete(row);
              }}
              title="Delete"
            />
          </span>
        ),
      },
    ],
    [handleDelete, selected],
  );

  return (
    <>
      <Breadcrumb items={breadcrumbItems} linkComponent={RouterLink} />
      <PageHeader
        title={bucket}
        action={
          <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void refresh();
              }}
            >
              Refresh
            </Button>
            <Button
              onClick={() => {
                navigate(basePath);
              }}
            >
              All buckets
            </Button>
          </span>
        }
      />

      <Panel>
        <PanelTitle>Upload</PanelTitle>
        <FileDropzone
          onDrop={(files) => {
            void handleDrop(files);
          }}
          multiple
          hint={
            prefix === ''
              ? `Drop files into bucket "${bucket}".`
              : `Drop files into "${bucket}/${prefix}".`
          }
        />
        {uploads.length > 0 ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <UploadQueue
              items={uploads}
              onDismiss={(id) => {
                setUploads((prev) => prev.filter((u) => u.id !== id));
              }}
              onClearCompleted={() => {
                setUploads((prev) =>
                  prev.filter((u) => u.status !== 'done' && u.status !== 'error'),
                );
              }}
            />
          </div>
        ) : null}
      </Panel>

      {error !== null ? (
        <Panel>
          <ErrorState
            title="Could not list objects"
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
        <Panel>
          <ObjectBrowser
            prefixes={result?.common_prefixes ?? []}
            currentPrefix={prefix}
            onPrefixChange={(next) => {
              setPrefix(next);
            }}
            selectionCount={selected.size}
            toolbar={
              selected.size > 0 ? (
                <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                  Delete selected
                </Button>
              ) : null
            }
          >
            {!loading && items.length === 0 ? (
              <EmptyState
                title={prefix === '' ? 'Bucket is empty' : 'Nothing here'}
                description="Drop files above to upload."
              />
            ) : (
              <DataTable
                columns={columns}
                data={items}
                rowKey={(row) => row.key}
                loading={loading}
              />
            )}
          </ObjectBrowser>
        </Panel>
      )}

      <Drawer
        title={preview ? lastSegment(preview.key) : 'Preview'}
        open={preview !== null}
        onClose={() => {
          setPreview(null);
        }}
        width={720}
        destroyOnClose
        extra={
          preview ? (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                window.open(inlineUrl(bucket, preview.key), '_blank');
              }}
            >
              Open
            </Button>
          ) : null
        }
      >
        {preview ? (
          isParquet(preview) ? (
            <ParquetViewer
              src={inlineUrl(bucket, preview.key)}
              title={preview.key}
            />
          ) : (
            <FilePreview
              src={inlineUrl(bucket, preview.key)}
              mimeType={inferMime(preview)}
              name={preview.key}
              size={preview.size}
            />
          )
        ) : null}
      </Drawer>

      <Drawer
        title="Share link"
        open={share !== null}
        onClose={() => {
          setShare(null);
        }}
        width={520}
        destroyOnClose
      >
        {share ? (
          <ShareLinkDialog
            objectKey={share.key}
            onGenerate={(opts) => generateShareLink(share, opts)}
            onClose={() => {
              setShare(null);
            }}
          />
        ) : null}
      </Drawer>
    </>
  );
}
