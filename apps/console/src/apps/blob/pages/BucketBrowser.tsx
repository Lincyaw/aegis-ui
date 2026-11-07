import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
import {
  Alert,
  Breadcrumb,
  type BreadcrumbItem,
  DataTable,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FileDropzone,
  FilePreview,
  formatBytes,
  MetadataList,
  ObjectBrowser,
  ObjectInspector,
  type ObjectInspectorTab,
  PageHeader,
  Panel,
  ParquetViewer,
  SearchInput,
  ShareLinkDialog,
  type ShareLinkResult,
  SkeletonText,
  Toolbar,
  UploadQueue,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { App as AntdApp, Button, Input, Modal } from 'antd';

import { errMsg } from '../../../api/apiClient';
import {
  batchDelete,
  copyObject,
  deleteObject,
  downloadZip,
  driverList,
  presignGet,
  presignPut,
  recordShare,
  uploadWithPresign,
} from '../../../api/blobClient';
import { RouterLink } from '../../shared/RouterLink';
import '../blob-app.css';
import { objectColumns } from '../components/objectColumns';
import { useUploads } from '../hooks/useUploads';
import { useWindowDragActive } from '../hooks/useWindowDragActive';
import {
  absoluteUrl,
  inferMime,
  isParquet,
  lastSegment,
  type ObjItem,
  toObjItem,
} from '../objects';
import { blobKeys } from '../queryKeys';

const PAGE_KEYS = 200;
const PREVIEW_TTL_SECONDS = 600;

function pickFiles(directory: boolean, onPick: (files: File[]) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  if (directory) {
    input.setAttribute('webkitdirectory', '');
  }
  input.onchange = () => {
    if (input.files && input.files.length > 0) {
      onPick(Array.from(input.files));
    }
  };
  input.click();
}

export default function BucketBrowser() {
  const { bucket: bucketParam = '' } = useParams<{ bucket: string }>();
  const bucket = decodeURIComponent(bucketParam);
  const { basePath } = useActiveApp();
  const navigate = useNavigate();
  const { message: msg, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = searchParams.get('prefix') ?? '';
  const folder = `${bucket}/${prefix}`;

  const setPrefix = useCallback(
    (next: string): void => {
      setSearchParams(next === '' ? {} : { prefix: next }, { replace: false });
    },
    [setSearchParams]
  );

  const [preview, setPreview] = useState<ObjItem | null>(null);
  const [share, setShare] = useState<ObjItem | null>(null);
  const [selection, setSelection] = useState<{
    folder: string;
    keys: string[];
  }>({ folder, keys: [] });
  const [search, setSearch] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const dragActive = useWindowDragActive();
  const uploads = useUploads(bucket);

  const listing = useInfiniteQuery({
    queryKey: blobKeys.folder(bucket, prefix),
    queryFn: ({ pageParam }) =>
      driverList(bucket, {
        prefix,
        delimiter: '/',
        max_keys: PAGE_KEYS,
        continuation_token: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.is_truncated === true ? last.next_continuation_token : undefined,
    enabled: bucket !== '',
  });

  // The signed URL is the only credential an <img>, <iframe> or the parquet
  // fetcher can carry, so a failed signature is shown rather than worked around.
  const previewUrl = useQuery({
    queryKey: ['blob', 'preview-url', bucket, preview?.key] as const,
    queryFn: async () => {
      const signed = await presignGet(bucket, {
        key: preview?.key ?? '',
        ttl_seconds: PREVIEW_TTL_SECONDS,
      });
      return signed.url;
    },
    enabled: preview !== null,
    staleTime: (PREVIEW_TTL_SECONDS / 2) * 1000,
  });

  const items = useMemo(
    () =>
      listing.data?.pages.flatMap((page) => page.items.map(toObjItem)) ?? [],
    [listing.data]
  );
  const prefixes = useMemo(
    () =>
      listing.data?.pages.flatMap((page) => page.common_prefixes ?? []) ?? [],
    [listing.data]
  );

  const filteredItems = useMemo(() => {
    if (!search) {
      return items;
    }
    const q = search.toLowerCase();
    return items.filter((it) => lastSegment(it.key).toLowerCase().includes(q));
  }, [items, search]);

  const selected = useMemo(() => {
    if (selection.folder !== folder) {
      return [];
    }
    const present = new Set(items.map((it) => it.key));
    return selection.keys.filter((key) => present.has(key));
  }, [folder, items, selection]);

  const setSelected = useCallback(
    (keys: string[]): void => {
      setSelection({ folder, keys });
    },
    [folder]
  );

  const invalidateBucket = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: blobKeys.bucketFolders(bucket),
      }),
    [bucket, queryClient]
  );

  const upload = useCallback(
    (files: File[]): void => {
      void uploads.upload(files, prefix).then(invalidateBucket);
    },
    [invalidateBucket, prefix, uploads]
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
          } catch (e) {
            void msg.error(`Delete failed: ${errMsg(e)}`);
          }
          await invalidateBucket();
        },
      });
    },
    [bucket, invalidateBucket, msg, modal, preview]
  );

  const handleBulkDelete = useCallback(() => {
    if (selected.length === 0) {
      return;
    }
    modal.confirm({
      title: `Delete ${selected.length.toString()} objects?`,
      content: 'This cannot be undone.',
      okText: 'Delete all',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await batchDelete(bucket, selected);
          if (res.failed.length === 0) {
            void msg.success(
              `Deleted ${res.deleted.length.toString()} objects`
            );
          } else {
            void msg.warning(
              `Deleted ${res.deleted.length.toString()}, ${res.failed.length.toString()} failed`
            );
          }
        } catch (e) {
          void msg.error(`Batch delete failed: ${errMsg(e)}`);
        }
        await invalidateBucket();
      },
    });
  }, [bucket, invalidateBucket, modal, msg, selected]);

  const handleBulkDownloadZip = useCallback(async (): Promise<void> => {
    if (selected.length === 0) {
      return;
    }
    if (selected.length > 1000) {
      void msg.error('Select at most 1000 objects for zip download.');
      return;
    }
    const confirmed = await new Promise<boolean>((resolve) => {
      if (selected.length <= 50) {
        resolve(true);
        return;
      }
      modal.confirm({
        title: `Download ${selected.length.toString()} objects as ZIP?`,
        content:
          'The server streams the archive — large selections may take a moment.',
        onOk: () => {
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
    if (!confirmed) {
      return;
    }
    const dismiss = msg.loading('Streaming ZIP…', 0);
    try {
      await downloadZip(bucket, selected, `${bucket}-selection.zip`);
      void msg.success('ZIP downloaded');
    } catch (e) {
      void msg.error(`ZIP failed: ${errMsg(e)}`);
    } finally {
      dismiss();
    }
  }, [bucket, modal, msg, selected]);

  const handleMove = useCallback(async (): Promise<void> => {
    // TODO(cross-bucket-move): needs backend POST /buckets/:src/cross-copy
    // endpoint. Until then this only moves within bucket={bucket}.
    if (selected.length === 0 || moveTarget === '') {
      return;
    }
    if (moveTarget.startsWith('/') || moveTarget.startsWith('..')) {
      void msg.error(
        'Target prefix must be a relative path within this bucket.'
      );
      return;
    }
    setMoveLoading(true);
    const targetPrefix = moveTarget.endsWith('/')
      ? moveTarget
      : `${moveTarget}/`;
    let failed = 0;
    await Promise.allSettled(
      selected.map(async (k) => {
        try {
          await copyObject(bucket, {
            src: k,
            dst: targetPrefix + lastSegment(k),
            delete_src: true,
          });
        } catch (e) {
          failed += 1;
          void msg.error(`Move failed for ${lastSegment(k)}: ${errMsg(e)}`);
        }
      })
    );
    setMoveLoading(false);
    setMoveOpen(false);
    setMoveTarget('');
    if (preview !== null && selected.includes(preview.key)) {
      setPreview(null);
    }
    if (failed === 0) {
      void msg.success(`Moved ${selected.length.toString()} objects`);
    }
    await invalidateBucket();
  }, [bucket, invalidateBucket, moveTarget, msg, preview, selected]);

  const generateShareLink = useCallback(
    async (
      item: ObjItem,
      opts: { ttlSeconds: number; asAttachment: boolean }
    ): Promise<ShareLinkResult> => {
      const filename = lastSegment(item.key);
      const pr = await presignGet(bucket, {
        key: item.key,
        ttl_seconds: opts.ttlSeconds,
        response_content_type: opts.asAttachment
          ? `application/octet-stream; disposition=attachment; filename="${filename}"`
          : undefined,
      });
      const url = absoluteUrl(pr.url);
      recordShare({
        id: `${bucket}:${item.key}:${Date.now().toString()}`,
        bucket,
        key: item.key,
        url,
        expiresAt: pr.expires_at,
        createdAt: new Date().toISOString(),
        asAttachment: opts.asAttachment,
      });
      return { url, expiresAt: pr.expires_at };
    },
    [bucket]
  );

  const copyUrl = useCallback(
    async (item: ObjItem): Promise<void> => {
      try {
        const pr = await presignGet(bucket, {
          key: item.key,
          ttl_seconds: 300,
        });
        await navigator.clipboard.writeText(absoluteUrl(pr.url));
        void msg.success('URL copied (5 min TTL)');
      } catch (e) {
        void msg.error(`Copy URL failed: ${errMsg(e)}`);
      }
    },
    [bucket, msg]
  );

  const downloadAsAttachment = useCallback(
    async (item: ObjItem): Promise<void> => {
      try {
        const pr = await presignGet(bucket, {
          key: item.key,
          ttl_seconds: 300,
        });
        const a = document.createElement('a');
        a.href = pr.url;
        a.download = lastSegment(item.key);
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        void msg.error(`Download failed: ${errMsg(e)}`);
      }
    },
    [bucket, msg]
  );

  const handleNewFolder = useCallback(async (): Promise<void> => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    setNewFolderLoading(true);
    try {
      const presign = await presignPut(bucket, {
        key: `${prefix}${name}/.keep`,
        content_type: 'application/octet-stream',
        content_length: 0,
        ttl_seconds: 300,
      });
      await uploadWithPresign(presign.presigned, new Blob([]));
      void msg.success(`Folder "${name}" created`);
      setNewFolderOpen(false);
      setNewFolderName('');
      await invalidateBucket();
    } catch (e) {
      void msg.error(`Create folder failed: ${errMsg(e)}`);
    } finally {
      setNewFolderLoading(false);
    }
  }, [bucket, invalidateBucket, msg, newFolderName, prefix]);

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
    const signed = (render: (src: string) => JSX.Element): JSX.Element => {
      if (previewUrl.isError) {
        return (
          <ErrorState
            title='Could not sign a preview link'
            description={errMsg(previewUrl.error)}
          />
        );
      }
      return previewUrl.data === undefined ? (
        <SkeletonText lines={4} />
      ) : (
        render(previewUrl.data)
      );
    };
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
                value: `${formatBytes(preview.size)} (${preview.size.toString()} B)`,
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
        content: signed((src) => (
          <FilePreview
            src={src}
            mimeType={inferMime(preview)}
            name={preview.key}
            size={preview.size}
          />
        )),
      },
    ];
    if (isParquet(preview)) {
      tabs.push({
        id: 'parquet',
        label: 'Parquet',
        content: signed((src) => (
          <ParquetViewer src={src} title={preview.key} />
        )),
      });
    }
    return tabs;
  }, [preview, previewUrl.data, previewUrl.error, previewUrl.isError]);

  const inspectorActions = preview ? (
    <span className='blob-actions'>
      <Button
        size='small'
        icon={<DownloadOutlined />}
        onClick={() => {
          void downloadAsAttachment(preview);
        }}
      >
        Download
      </Button>
      <Button
        size='small'
        icon={<CopyOutlined />}
        onClick={() => {
          void copyUrl(preview);
        }}
      >
        Copy URL
      </Button>
      <Button
        size='small'
        icon={<ShareAltOutlined />}
        onClick={() => {
          setShare(preview);
        }}
      >
        Share
      </Button>
      <Button
        size='small'
        danger
        icon={<DeleteOutlined />}
        onClick={() => {
          handleDelete(preview);
        }}
      >
        Delete
      </Button>
    </span>
  ) : null;

  const columns = useMemo(
    () =>
      objectColumns({
        preview: setPreview,
        download: (item) => {
          void downloadAsAttachment(item);
        },
        copyUrl: (item) => {
          void copyUrl(item);
        },
        share: setShare,
        remove: handleDelete,
      }),
    [copyUrl, downloadAsAttachment, handleDelete]
  );

  const toolbarRight =
    selected.length > 0 ? (
      <span className='blob-actions'>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            void handleBulkDownloadZip();
          }}
        >
          Download ZIP ({selected.length.toString()})
        </Button>
        <Button
          onClick={() => {
            setMoveOpen(true);
          }}
        >
          Move…
        </Button>
        <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
          Delete ({selected.length.toString()})
        </Button>
      </span>
    ) : (
      <span className='blob-actions'>
        <Button
          icon={<FolderAddOutlined />}
          onClick={() => {
            setNewFolderOpen(true);
          }}
        >
          New folder
        </Button>
        <DropdownMenu
          align='right'
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
                pickFiles(false, upload);
              },
            },
            {
              key: 'folder',
              label: 'Folder',
              onClick: () => {
                pickFiles(true, upload);
              },
            },
          ]}
        />
        <Button
          aria-label='Reload'
          icon={<ReloadOutlined />}
          loading={listing.isRefetching}
          onClick={() => {
            void listing.refetch();
          }}
        />
      </span>
    );

  const loading = listing.isPending && bucket !== '';

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
            placeholder='Filter objects…'
            onClear={() => {
              setSearch('');
            }}
          />
        }
        right={toolbarRight}
      />

      {uploads.items.length > 0 ? (
        <Panel>
          <UploadQueue
            items={uploads.items}
            onDismiss={uploads.dismiss}
            onClearCompleted={uploads.clearFinished}
          />
        </Panel>
      ) : null}

      {listing.isError && listing.data === undefined ? (
        <Panel>
          <ErrorState
            title='Could not list objects'
            description={errMsg(listing.error)}
            action={
              <Button
                onClick={() => {
                  void listing.refetch();
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
            prefixes={prefixes}
            currentPrefix={prefix}
            onPrefixChange={setPrefix}
            selectionCount={selected.length}
            loading={loading}
            dragOverlay={
              dragActive ? (
                <FileDropzone
                  variant='overlay'
                  onDrop={upload}
                  multiple
                  hint='Drop to upload'
                />
              ) : undefined
            }
            footer={
              listing.isFetchNextPageError ? (
                <Alert tone='error' title='Could not load more objects'>
                  {errMsg(listing.error)}
                </Alert>
              ) : listing.hasNextPage ? (
                <Button
                  loading={listing.isFetchingNextPage}
                  onClick={() => {
                    void listing.fetchNextPage();
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
                framed={false}
                columns={columns}
                data={filteredItems}
                rowKey={(row) => row.key}
                loading={loading}
                selectable
                selectedKeys={selected}
                onSelectedKeysChange={(keys) => {
                  setSelected(keys.map(String));
                }}
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
          preview ? (isParquet(preview) ? 'parquet' : 'preview') : undefined
        }
        actions={inspectorActions}
        width={720}
        defaultMaximized
      />

      <Modal
        title='Share link'
        open={share !== null}
        onCancel={() => {
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
              setShare(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        title='New folder'
        open={newFolderOpen}
        onCancel={() => {
          setNewFolderOpen(false);
          setNewFolderName('');
        }}
        onOk={() => {
          void handleNewFolder();
        }}
        okText='Create'
        confirmLoading={newFolderLoading}
        destroyOnClose
      >
        <Input
          placeholder='folder-name'
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
        title={`Move within "${bucket}"`}
        open={moveOpen}
        onCancel={() => {
          setMoveOpen(false);
          setMoveTarget('');
        }}
        onOk={() => {
          void handleMove();
        }}
        okText='Move'
        confirmLoading={moveLoading}
        destroyOnClose
      >
        <div className='blob-form'>
          <p className='blob-hint'>
            Server-side copy then delete within this bucket — no client
            bandwidth round-trip. Cross-bucket move is not yet supported.
          </p>
          <Input
            placeholder='target/prefix/'
            value={moveTarget}
            onChange={(e) => {
              setMoveTarget(e.target.value);
            }}
          />
        </div>
      </Modal>
    </>
  );
}
