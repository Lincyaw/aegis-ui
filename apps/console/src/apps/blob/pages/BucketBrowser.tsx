import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  CaretDownOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Breadcrumb,
  type BreadcrumbItem,
  DataTable,
  Dialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FileDropzone,
  ObjectBrowser,
  PageHeader,
  Panel,
  SearchInput,
  ShareLinkDialog,
  Toolbar,
  UploadQueue,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { driverList } from '../../../api/blobClient';
import { RouterLink } from '../../../routing/RouterLink';
import '../blob-app.css';
import { MoveDialog } from '../components/MoveDialog';
import { NewFolderDialog } from '../components/NewFolderDialog';
import { objectColumns } from '../components/objectColumns';
import { ObjectPreview } from '../components/ObjectPreview';
import { useObjectActions } from '../hooks/useObjectActions';
import { useUploads } from '../hooks/useUploads';
import { useWindowDragActive } from '../hooks/useWindowDragActive';
import { lastSegment, type ObjItem, toObjItem } from '../objects';
import { blobKeys } from '../queryKeys';

const PAGE_KEYS = 200;

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
  const [moveOpen, setMoveOpen] = useState(false);
  const dragActive = useWindowDragActive();
  const uploads = useUploads(bucket);
  const onRemoved = useCallback((keys: string[]): void => {
    setPreview((cur) => (cur !== null && keys.includes(cur.key) ? null : cur));
  }, []);
  const actions = useObjectActions(bucket, prefix, onRemoved);

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

  const upload = useCallback(
    (files: File[]): void => {
      void uploads.upload(files, prefix).then(actions.refresh);
    },
    [actions.refresh, prefix, uploads]
  );

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

  const columns = useMemo(
    () =>
      objectColumns({
        preview: setPreview,
        download: (item) => {
          void actions.download(item);
        },
        copyUrl: (item) => {
          void actions.copyUrl(item);
        },
        share: setShare,
        remove: actions.remove,
      }),
    [actions]
  );

  const toolbarRight =
    selected.length > 0 ? (
      <span className='blob-actions'>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            void actions.downloadZip(selected);
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
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            actions.removeMany(selected);
          }}
        >
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
        left={
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

      {listing.isRefetchError ? (
        <Alert
          tone='error'
          title={`Could not reload objects: ${errMsg(listing.error)}`}
        >
          <span className='blob-reload-error'>
            Showing the rows from the last successful load.
            <Button
              size='small'
              onClick={() => {
                void listing.refetch();
              }}
            >
              Try again
            </Button>
          </span>
        </Alert>
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

      <ObjectPreview
        bucket={bucket}
        item={preview}
        actions={actions}
        onShare={setShare}
        onClose={() => {
          setPreview(null);
        }}
      />

      <Dialog
        open={share !== null}
        title='Share link'
        onClose={() => {
          setShare(null);
        }}
      >
        {share ? (
          <ShareLinkDialog
            objectKey={share.key}
            onGenerate={(opts) => actions.share(share, opts)}
            onClose={() => {
              setShare(null);
            }}
          />
        ) : null}
      </Dialog>

      <NewFolderDialog
        open={newFolderOpen}
        onCreate={actions.createFolder}
        onClose={() => {
          setNewFolderOpen(false);
        }}
      />

      <MoveDialog
        open={moveOpen}
        bucket={bucket}
        onMove={(target) => actions.move(selected, target)}
        onClose={() => {
          setMoveOpen(false);
        }}
      />
    </>
  );
}
