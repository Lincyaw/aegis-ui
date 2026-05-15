import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  CaretDownOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, Input, Modal, Tooltip } from 'antd';
import JSZip from 'jszip';

import {
  Breadcrumb,
  type BreadcrumbItem,
  Chip,
  DataTable,
  type DataTableColumn,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FileDropzone,
  type FileDropzoneItem,
  FilePreview,
  MetadataList,
  MonoValue,
  ObjectBrowser,
  ObjectInspector,
  type ObjectInspectorTab,
  PageHeader,
  Panel,
  ParquetViewer,
  SearchInput,
  ShareLinkDialog,
  type ShareLinkResult,
  Toolbar,
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
  etag?: string;
  metadata?: Record<string, string>;
}

const PARQUET_RE = /\.parquet$/i;
const UPLOAD_CONCURRENCY = 3;
const EWMA_ALPHA = 0.3;

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

function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    let idx = 0;
    let active = 0;
    let done = 0;

    function next(): void {
      while (active < concurrency && idx < items.length) {
        const item = items[idx];
        if (item === undefined) {
          break;
        }
        idx += 1;
        active += 1;
        worker(item).finally(() => {
          active -= 1;
          done += 1;
          if (done === items.length) {
            resolve();
          } else {
            next();
          }
        });
      }
      if (items.length === 0) {
        resolve();
      }
    }

    next();
  });
}

export default function BucketBrowser() {
  const { bucket: bucketParam = '' } = useParams<{ bucket: string }>();
  const bucket = decodeURIComponent(bucketParam);
  const { basePath } = useActiveApp();
  const navigate = useNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = searchParams.get('prefix') ?? '';

  const setPrefix = useCallback(
    (next: string): void => {
      setSearchParams(
        next === '' ? {} : { prefix: next },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const [result, setResult] = useState<DriverListResult | null>(null);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [isTruncated, setIsTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<FileDropzoneItem[]>([]);
  const [showUploadQueue, setShowUploadQueue] = useState(false);
  const [preview, setPreview] = useState<ObjItem | null>(null);
  const [share, setShare] = useState<ObjItem | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dragDepth, setDragDepth] = useState(0);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (bucket === '') {
      return;
    }
    setLoading(true);
    setError(null);
    setContinuationToken(undefined);
    try {
      const res = await driverList(bucket, {
        prefix,
        delimiter: '/',
        max_keys: 200,
      });
      setResult(res);
      setIsTruncated(res.is_truncated ?? false);
      setContinuationToken(res.next_continuation_token);
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

  const loadMore = useCallback(async (): Promise<void> => {
    if (!isTruncated || continuationToken === undefined) {
      return;
    }
    setLoadingMore(true);
    try {
      const res = await driverList(bucket, {
        prefix,
        delimiter: '/',
        max_keys: 200,
        continuation_token: continuationToken,
      });
      setResult((prev) => {
        if (!prev) {
          return res;
        }
        return {
          ...res,
          items: [...prev.items, ...res.items],
          common_prefixes: [
            ...(prev.common_prefixes ?? []),
            ...(res.common_prefixes ?? []),
          ],
        };
      });
      setIsTruncated(res.is_truncated ?? false);
      setContinuationToken(res.next_continuation_token);
    } catch (e) {
      void msg.error(`Load more failed: ${errMsg(e)}`);
    } finally {
      setLoadingMore(false);
    }
  }, [bucket, continuationToken, isTruncated, msg, prefix]);

  const items: ObjItem[] = useMemo(() => {
    if (!result?.items) {
      return [];
    }
    return result.items.map((it) => ({
      key: it.key,
      size: it.size_bytes,
      contentType: it.content_type,
      updatedAt: it.updated_at,
      etag: it.etag,
      metadata: it.metadata,
    }));
  }, [result]);

  const filteredItems = useMemo(() => {
    if (!search) {
      return items;
    }
    const q = search.toLowerCase();
    return items.filter((it) => lastSegment(it.key).toLowerCase().includes(q));
  }, [items, search]);

  const xhrRefs = useRef<Map<string, XMLHttpRequest>>(new Map());

  const uploadOneXhr = useCallback(
    (item: FileDropzoneItem, file: File, key: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        void (async () => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id ? { ...u, status: 'uploading' } : u,
            ),
          );
          let presign: Awaited<ReturnType<typeof presignPut>>;
          try {
            presign = await presignPut(bucket, {
              key,
              content_type: file.type || 'application/octet-stream',
              content_length: file.size,
              ttl_seconds: 300,
            });
          } catch (e) {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? { ...u, status: 'error', error: errMsg(e) }
                  : u,
              ),
            );
            resolve();
            return;
          }

          const xhr = new XMLHttpRequest();
          xhrRefs.current.set(item.id, xhr);

          let lastLoaded = 0;
          let lastTime = Date.now();
          let ewmaSpeed = 0;

          xhr.upload.onprogress = (ev) => {
            if (!ev.lengthComputable) {
              return;
            }
            const now = Date.now();
            const dtMs = now - lastTime;
            const dBytes = ev.loaded - lastLoaded;
            if (dtMs > 0) {
              const instantBps = (dBytes / dtMs) * 1000;
              ewmaSpeed =
                ewmaSpeed === 0
                  ? instantBps
                  : EWMA_ALPHA * instantBps + (1 - EWMA_ALPHA) * ewmaSpeed;
            }
            lastLoaded = ev.loaded;
            lastTime = now;
            const remaining = file.size - ev.loaded;
            const etaSeconds = ewmaSpeed > 0 ? remaining / ewmaSpeed : undefined;
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? {
                      ...u,
                      progress: ev.loaded / ev.total,
                      bytesUploaded: ev.loaded,
                      speedBps: ewmaSpeed,
                      etaSeconds,
                    }
                  : u,
              ),
            );
          };

          xhr.onload = () => {
            xhrRefs.current.delete(item.id);
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === item.id
                    ? { ...u, status: 'done', progress: 1 }
                    : u,
                ),
              );
            } else {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === item.id
                    ? {
                        ...u,
                        status: 'error',
                        error: `HTTP ${xhr.status.toString()}`,
                      }
                    : u,
                ),
              );
            }
            resolve();
          };

          xhr.onerror = () => {
            xhrRefs.current.delete(item.id);
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? { ...u, status: 'error', error: 'Network error' }
                  : u,
              ),
            );
            resolve();
          };

          xhr.onabort = () => {
            xhrRefs.current.delete(item.id);
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? { ...u, status: 'error', error: 'Cancelled' }
                  : u,
              ),
            );
            resolve();
          };

          const headers = new Headers(presign.presigned.headers ?? {});
          headers.set('content-type', file.type || 'application/octet-stream');

          xhr.open(presign.presigned.method, presign.presigned.url);
          headers.forEach((val, name) => {
            xhr.setRequestHeader(name, val);
          });
          xhr.send(file);
        })();
      });
    },
    [bucket],
  );

  const handleDrop = useCallback(
    async (files: File[]): Promise<void> => {
      const queued: FileDropzoneItem[] = files.map((f) => {
        const id = `${f.name}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 6)}`;
        return {
          id,
          file: f,
          status: 'queued',
          onCancel: () => {
            xhrRefs.current.get(id)?.abort();
          },
        };
      });
      setUploads((prev) => [...queued, ...prev]);
      setShowUploadQueue(true);

      await runPool(queued, UPLOAD_CONCURRENCY, (item) => {
        const file = item.file;
        const key =
          file.webkitRelativePath !== ''
            ? prefix + file.webkitRelativePath
            : prefix + file.name;
        return uploadOneXhr(item, file, key);
      });

      await refresh();
    },
    [prefix, refresh, uploadOneXhr],
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
            if (preview?.key === item.key) {
              setPreview(null);
            }
            await refresh();
          } catch (e) {
            void msg.error(`Delete failed: ${errMsg(e)}`);
          }
        },
      });
    },
    [bucket, msg, modal, preview, refresh],
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

  const handleBulkDownloadZip = useCallback(async (): Promise<void> => {
    const keys = Array.from(selected);
    if (keys.length === 0) {
      return;
    }
    if (keys.length > 200) {
      void msg.error('Select at most 200 objects for zip download.');
      return;
    }
    const confirmed = await new Promise<boolean>((resolve) => {
      if (keys.length <= 50) {
        resolve(true);
        return;
      }
      modal.confirm({
        title: `Download ${keys.length.toString()} objects as ZIP?`,
        content: 'This will fetch all selected objects. Continue?',
        onOk: () => { resolve(true); },
        onCancel: () => { resolve(false); },
      });
    });
    if (!confirmed) {
      return;
    }
    const key = msg.loading('Building ZIP…', 0);
    try {
      const zip = new JSZip();
      await Promise.all(
        keys.map(async (k) => {
          const url = inlineUrl(bucket, k);
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`${k}: HTTP ${res.status.toString()}`);
          }
          const blob = await res.blob();
          zip.file(k, blob);
        }),
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bucket}-selection.zip`;
      a.click();
      URL.revokeObjectURL(url);
      void msg.success('ZIP downloaded');
    } catch (e) {
      void msg.error(`ZIP failed: ${errMsg(e)}`);
    } finally {
      key();
    }
  }, [bucket, modal, msg, selected]);

  const handleMove = useCallback(async (): Promise<void> => {
    const keys = Array.from(selected);
    if (keys.length === 0 || moveTarget === '') {
      return;
    }
    setMoveLoading(true);
    const targetPrefix = moveTarget.endsWith('/') ? moveTarget : `${moveTarget}/`;
    let failed = 0;
    await Promise.allSettled(
      keys.map(async (k) => {
        if (k.split('').reduce((acc) => acc, 0) > 100 * 1024 * 1024) {
          void msg.warning(`Skipped ${k} (>100 MB)`);
          return;
        }
        try {
          const srcUrl = inlineUrl(bucket, k);
          const getRes = await fetch(srcUrl);
          if (!getRes.ok) {
            throw new Error(`GET failed: HTTP ${getRes.status.toString()}`);
          }
          const blob = await getRes.blob();
          const newKey = targetPrefix + lastSegment(k);
          const presign = await presignPut(bucket, {
            key: newKey,
            content_type: blob.type || 'application/octet-stream',
            content_length: blob.size,
            ttl_seconds: 300,
          });
          await uploadWithPresign(presign.presigned, blob);
          await deleteObject(bucket, k);
        } catch (e) {
          failed += 1;
          void msg.error(`Move failed for ${lastSegment(k)}: ${errMsg(e)}`);
        }
      }),
    );
    setMoveLoading(false);
    setMoveOpen(false);
    setMoveTarget('');
    if (failed === 0) {
      void msg.success(`Moved ${keys.length.toString()} objects`);
    }
    await refresh();
  }, [bucket, moveTarget, msg, refresh, selected]);

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

  const copyUrl = useCallback(
    async (item: ObjItem): Promise<void> => {
      try {
        const pr = await presignGet(bucket, { key: item.key, ttl_seconds: 300 });
        const fullUrl = pr.url.startsWith('http')
          ? pr.url
          : `${window.location.origin}${pr.url}`;
        await navigator.clipboard.writeText(fullUrl);
        void msg.success('URL copied (5 min TTL)');
      } catch (e) {
        void msg.error(`Copy URL failed: ${errMsg(e)}`);
      }
    },
    [bucket, msg],
  );

  const handleNewFolder = useCallback(async (): Promise<void> => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    setNewFolderLoading(true);
    try {
      const keepKey = `${prefix}${name}/.keep`;
      const presign = await presignPut(bucket, {
        key: keepKey,
        content_type: 'application/octet-stream',
        content_length: 0,
        ttl_seconds: 300,
      });
      await uploadWithPresign(presign.presigned, new Blob([]));
      void msg.success(`Folder "${name}" created`);
      setNewFolderOpen(false);
      setNewFolderName('');
      await refresh();
    } catch (e) {
      void msg.error(`Create folder failed: ${errMsg(e)}`);
    } finally {
      setNewFolderLoading(false);
    }
  }, [bucket, msg, newFolderName, prefix, refresh]);

  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const out: BreadcrumbItem[] = [
      { label: 'Buckets', to: basePath },
      {
        label: bucket,
        to:
          prefix === ''
            ? undefined
            : `${basePath}/${encodeURIComponent(bucket)}`,
      },
    ];
    if (prefix !== '') {
      const segs = prefix.split('/').filter(Boolean);
      let acc = '';
      segs.forEach((seg, i) => {
        acc += `${seg}/`;
        const isLast = i === segs.length - 1;
        out.push({
          label: seg,
          to: isLast
            ? undefined
            : `${basePath}/${encodeURIComponent(bucket)}?prefix=${encodeURIComponent(acc)}`,
        });
      });
    }
    return out;
  }, [basePath, bucket, prefix]);

  const inspectorTabs = useMemo<ObjectInspectorTab[]>(() => {
    if (!preview) {
      return [];
    }
    const tabs: ObjectInspectorTab[] = [
      {
        id: 'summary',
        label: 'Summary',
        content: (
          <MetadataList
            entries={[
              { label: 'Key', value: preview.key, mono: true, copyable: true },
              {
                label: 'Size',
                value: `${humanBytes(preview.size)} (${preview.size.toString()} B)`,
              },
              {
                label: 'Content-Type',
                value: preview.contentType ?? '—',
                mono: !!preview.contentType,
              },
              {
                label: 'Updated',
                value: `${new Date(preview.updatedAt).toLocaleString()} (${preview.updatedAt})`,
              },
              ...(preview.etag
                ? [{ label: 'ETag', value: preview.etag, mono: true as const }]
                : []),
              ...(preview.metadata && Object.keys(preview.metadata).length > 0
                ? Object.entries(preview.metadata).map(([k, v]) => ({
                    label: k,
                    value: v,
                    mono: true as const,
                  }))
                : []),
            ]}
          />
        ),
      },
      {
        id: 'preview',
        label: 'Preview',
        content: (
          <FilePreview
            src={inlineUrl(bucket, preview.key)}
            mimeType={inferMime(preview)}
            name={preview.key}
            size={preview.size}
          />
        ),
      },
    ];
    if (isParquet(preview)) {
      tabs.push({
        id: 'parquet',
        label: 'Parquet',
        content: (
          <ParquetViewer
            src={inlineUrl(bucket, preview.key)}
            title={preview.key}
          />
        ),
      });
    }
    tabs.push({
      id: 'versions',
      label: 'Versions',
      disabled: true,
      hint: 'Versioning is not enabled on this bucket.',
      content: null,
    });
    return tabs;
  }, [bucket, preview]);

  const inspectorActions = useMemo(() => {
    if (!preview) {
      return null;
    }
    return (
      <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => {
            window.open(inlineUrl(bucket, preview.key), '_blank');
          }}
        >
          Download
        </Button>
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => {
            void copyUrl(preview);
          }}
        >
          Copy URL
        </Button>
        <Button
          size="small"
          icon={<ShareAltOutlined />}
          onClick={() => {
            setShare(preview);
            setShareModalOpen(true);
          }}
        >
          Share
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            handleDelete(preview);
          }}
        >
          Delete
        </Button>
      </span>
    );
  }, [bucket, copyUrl, handleDelete, preview]);

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
          <MonoValue size="sm">
            {new Date(row.updatedAt).toLocaleString()}
          </MonoValue>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        truncate: false,
        width: 200,
        render: (row) => (
          <DropdownMenu
            align="right"
            trigger={
              <Button size="small" type="text">
                Actions <CaretDownOutlined />
              </Button>
            }
            items={[
              {
                key: 'preview',
                label: 'Preview',
                icon: <DownloadOutlined />,
                onClick: () => {
                  setPreview(row);
                },
              },
              {
                key: 'download',
                label: 'Download',
                icon: <DownloadOutlined />,
                onClick: () => {
                  window.open(inlineUrl(bucket, row.key), '_blank');
                },
              },
              {
                key: 'copy-url',
                label: 'Copy URL',
                icon: <CopyOutlined />,
                onClick: () => {
                  void copyUrl(row);
                },
              },
              {
                key: 'share',
                label: 'Share',
                icon: <ShareAltOutlined />,
                onClick: () => {
                  setShare(row);
                  setShareModalOpen(true);
                },
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  handleDelete(row);
                },
              },
            ]}
          />
        ),
      },
    ],
    [bucket, copyUrl, handleDelete, selected],
  );

  // Window-level drag-over detection
  useEffect(() => {
    let depth = 0;

    const onDragEnter = () => {
      depth += 1;
      setDragDepth(depth);
    };

    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        depth = 0;
        setDragDepth(0);
      } else {
        depth = Math.max(0, depth - 1);
        setDragDepth(depth);
      }
    };

    const onDrop = () => {
      depth = 0;
      setDragDepth(0);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const dragActive = dragDepth > 0;

  const toolbarRight =
    selected.size > 0 ? (
      <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            void handleBulkDownloadZip();
          }}
        >
          Download ZIP ({selected.size.toString()})
        </Button>
        <Button
          onClick={() => {
            setMoveOpen(true);
          }}
        >
          Move…
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleBulkDelete}
        >
          Delete ({selected.size.toString()})
        </Button>
      </span>
    ) : (
      <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button
          icon={<FolderAddOutlined />}
          onClick={() => {
            setNewFolderOpen(true);
          }}
        >
          New folder
        </Button>
        <DropdownMenu
          align="right"
          trigger={
            <Button icon={<UploadOutlined />}>
              Upload <CaretDownOutlined />
            </Button>
          }
          items={[
            {
              key: 'files',
              label: 'Files',
              onClick: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = () => {
                  if (input.files && input.files.length > 0) {
                    void handleDrop(Array.from(input.files));
                  }
                };
                input.click();
              },
            },
            {
              key: 'folder',
              label: 'Folder',
              onClick: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.setAttribute('webkitdirectory', '');
                input.multiple = true;
                input.onchange = () => {
                  if (input.files && input.files.length > 0) {
                    void handleDrop(Array.from(input.files));
                  }
                };
                input.click();
              },
            },
          ]}
        />
        <Tooltip title="List mode only" placement="top">
          <Button disabled>
            ☰
          </Button>
        </Tooltip>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void refresh();
          }}
        />
      </span>
    );

  return (
    <>
      <Breadcrumb items={breadcrumbItems} linkComponent={RouterLink} />
      <PageHeader
        title={bucket}
        action={
          <Button
            onClick={() => {
              navigate(basePath);
            }}
          >
            All buckets
          </Button>
        }
      />

      <Toolbar
        center={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter objects…"
            onClear={() => { setSearch(''); }}
          />
        }
        right={toolbarRight}
      />

      {showUploadQueue && uploads.length > 0 ? (
        <Panel>
          <UploadQueue
            items={uploads}
            onDismiss={(id) => {
              setUploads((prev) => prev.filter((u) => u.id !== id));
            }}
            onClearCompleted={() => {
              setUploads((prev) =>
                prev.filter(
                  (u) => u.status !== 'done' && u.status !== 'error',
                ),
              );
              if (uploads.every((u) => u.status === 'done' || u.status === 'error')) {
                setShowUploadQueue(false);
              }
            }}
          />
        </Panel>
      ) : null}

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
            loading={loading}
            searchSlot={undefined}
            dragOverlay={
              dragActive ? (
                <FileDropzone
                  variant="overlay"
                  onDrop={(files) => {
                    void handleDrop(files);
                  }}
                  multiple
                  hint="Drop to upload"
                />
              ) : undefined
            }
            footer={
              isTruncated ? (
                <Button
                  loading={loadingMore}
                  onClick={() => {
                    void loadMore();
                  }}
                >
                  Load more
                </Button>
              ) : undefined
            }
          >
            {!loading && filteredItems.length === 0 ? (
              <EmptyState
                title={
                  search
                    ? 'No matches'
                    : prefix === ''
                      ? 'Bucket is empty'
                      : 'Nothing here'
                }
                description={
                  search
                    ? 'Try a different search term.'
                    : 'Drop files here or use the Upload button.'
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredItems}
                rowKey={(row) => row.key}
                loading={loading}
              />
            )}
          </ObjectBrowser>
        </Panel>
      )}

      <ObjectInspector
        open={preview !== null}
        onClose={() => {
          setPreview(null);
        }}
        title={preview ? lastSegment(preview.key) : ''}
        subtitle={preview?.key}
        tabs={inspectorTabs}
        defaultTabId={
          preview
            ? isParquet(preview)
              ? 'parquet'
              : 'preview'
            : undefined
        }
        actions={inspectorActions}
        width={720}
      />

      <Modal
        title="Share link"
        open={shareModalOpen}
        onCancel={() => {
          setShareModalOpen(false);
          setShare(null);
        }}
        footer={null}
        destroyOnClose
      >
        {share ? (
          <ShareLinkDialog
            objectKey={share.key}
            onGenerate={(opts) => generateShareLink(share, opts)}
            onClose={() => {
              setShareModalOpen(false);
              setShare(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        title="New folder"
        open={newFolderOpen}
        onCancel={() => {
          setNewFolderOpen(false);
          setNewFolderName('');
        }}
        onOk={() => {
          void handleNewFolder();
        }}
        okText="Create"
        confirmLoading={newFolderLoading}
        destroyOnClose
      >
        <Input
          placeholder="folder-name"
          value={newFolderName}
          onChange={(e) => {
            setNewFolderName(e.target.value);
          }}
          onPressEnter={() => {
            void handleNewFolder();
          }}
        />
      </Modal>

      <Modal
        title="Move selected objects"
        open={moveOpen}
        onCancel={() => {
          setMoveOpen(false);
          setMoveTarget('');
        }}
        onOk={() => {
          void handleMove();
        }}
        okText="Move"
        confirmLoading={moveLoading}
        destroyOnClose
      >
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Objects are re-uploaded to the new prefix then deleted. Large files (&gt;100 MB) are skipped.
          This doubles bandwidth usage.
        </p>
        <Input
          placeholder="target/prefix/"
          value={moveTarget}
          onChange={(e) => {
            setMoveTarget(e.target.value);
          }}
        />
      </Modal>
    </>
  );
}
