import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  EmptyState,
  ErrorState,
  FileTree,
  type FileTreeFile,
  FolderDropzone,
  formatBytes,
  MetadataList,
  PageHeader,
  Panel,
  PanelTitle,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Button, Input, Radio } from 'antd';

import {
  PAGES_LIMITS,
  type PageVisibility,
  shareUrlForSlug,
  useDeletePage,
  usePageDetail,
  useReplacePage,
  useUpdatePage,
  validateUpload,
} from '../api/pages-client';
import '../pages-app.css';

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export default function PageDetail() {
  const { id: idParam = '' } = useParams<{ id: string }>();
  const id = /^\d+$/.test(idParam) ? Number(idParam) : Number.NaN;
  const validId = Number.isSafeInteger(id);
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  const { message: msg, modal } = AntdApp.useApp();

  const detail = usePageDetail(validId ? id : undefined);
  const update = useUpdatePage(id);
  const replace = useReplacePage(id);
  const del = useDeletePage();

  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<PageVisibility>('private');

  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceFiles, setReplaceFiles] = useState<File[]>([]);

  const data = detail.data;

  const replaceValidation = useMemo(
    () => validateUpload(replaceFiles, undefined),
    [replaceFiles]
  );

  const startEdit = (): void => {
    if (!data) {
      return;
    }
    setSlug(data.slug ?? '');
    setTitle(data.title ?? '');
    setVisibility((data.visibility as PageVisibility | undefined) ?? 'private');
    setEditing(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!data) {
      return;
    }
    try {
      const trimmedSlug = slug.trim();
      await update.mutateAsync({
        ...(trimmedSlug !== '' ? { slug: trimmedSlug } : {}),
        title: title.trim(),
        visibility,
      });
      void msg.success('Updated');
      setEditing(false);
    } catch (e) {
      void msg.error(
        `Update failed: ${e instanceof Error ? e.message : 'unknown'}`
      );
    }
  };

  const handleConfirmReplace = async (): Promise<void> => {
    if (!replaceValidation.ok) {
      return;
    }
    try {
      await replace.mutateAsync({ files: replaceFiles });
      void msg.success('Files replaced');
      setReplaceFiles([]);
      setReplaceMode(false);
    } catch (e) {
      void msg.error(
        `Replace failed: ${e instanceof Error ? e.message : 'unknown'}`
      );
    }
  };

  const handleDelete = (): void => {
    if (!data?.id) {
      return;
    }
    const targetId = data.id;
    modal.confirm({
      title: `Delete "${data.slug ?? ''}"?`,
      content:
        'Permanently removes the site and all of its files. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del.mutateAsync(targetId);
          void msg.success('Deleted');
          navigate(basePath);
        } catch (e) {
          void msg.error(
            `Delete failed: ${e instanceof Error ? e.message : 'unknown'}`
          );
        }
      },
    });
  };

  const shareUrl = useMemo(
    () => (data?.slug ? shareUrlForSlug(data.slug) : ''),
    [data?.slug]
  );

  const copyShareUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      void msg.success('Copied');
    } catch {
      void msg.error('Clipboard unavailable');
    }
  };

  const files = useMemo<FileTreeFile[]>(
    () =>
      (detail.data?.files ?? []).flatMap((f) =>
        f.path ? [{ path: f.path, note: formatBytes(f.size_bytes ?? 0) }] : []
      ),
    [detail.data?.files]
  );

  if (!validId) {
    return (
      <>
        <PageHeader title='Page detail' />
        <Panel>
          <ErrorState
            title='Not a page id'
            description={`"${idParam}" is not a page id. Open a page from the list.`}
            action={
              <Button
                onClick={() => {
                  navigate(basePath);
                }}
              >
                My pages
              </Button>
            }
          />
        </Panel>
      </>
    );
  }

  if (detail.error) {
    return (
      <>
        <PageHeader title='Page detail' />
        <Panel>
          <ErrorState
            title='Could not load page'
            description={
              detail.error instanceof Error ? detail.error.message : 'unknown'
            }
            action={
              <Button
                onClick={() => {
                  void detail.refetch();
                }}
              >
                Retry
              </Button>
            }
          />
        </Panel>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title='Page detail' />
        <Panel>
          <EmptyState title='Loading…' />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          data.title !== undefined && data.title !== ''
            ? data.title
            : (data.slug ?? '')
        }
        description={`${data.slug ?? ''} · ${data.visibility ?? ''} · ${(data.file_count ?? 0).toString()} files`}
        action={
          <span className='pages-app__header-actions'>
            <Button
              icon={<ExportOutlined />}
              onClick={() => {
                window.open(shareUrl, '_blank', 'noopener');
              }}
            >
              Open
            </Button>
            <Button icon={<EditOutlined />} onClick={startEdit}>
              Edit
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setReplaceMode(true);
              }}
            >
              Replace contents
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              loading={del.isPending}
            >
              Delete
            </Button>
          </span>
        }
      />

      <Panel>
        <PanelTitle>Share link</PanelTitle>
        <div className='pages-app__share'>
          <span className='pages-app__share-url'>{shareUrl}</span>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              void copyShareUrl();
            }}
          >
            Copy
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={() => {
              window.open(shareUrl, '_blank', 'noopener');
            }}
          >
            Open
          </Button>
        </div>
      </Panel>

      {editing ? (
        <Panel>
          <PanelTitle>Edit metadata</PanelTitle>
          <div className='pages-app__form'>
            <div>
              <label className='pages-app__label'>Slug</label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                }}
              />
            </div>
            <div>
              <label className='pages-app__label'>Title</label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
              />
            </div>
            <div>
              <label className='pages-app__label'>Visibility</label>
              <Radio.Group
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value as PageVisibility);
                }}
                className='pages-app__radio-group'
              >
                <Radio value='public_listed'>Public listed</Radio>
                <Radio value='public_unlisted'>Public unlisted</Radio>
                <Radio value='private'>Private</Radio>
              </Radio.Group>
            </div>
            <div className='pages-app__row pages-app__row--inline'>
              <Button
                type='primary'
                loading={update.isPending}
                onClick={() => {
                  void handleSave();
                }}
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelTitle>Metadata</PanelTitle>
          <MetadataList
            entries={[
              { label: 'ID', value: (data.id ?? 0).toString(), mono: true },
              {
                label: 'Slug',
                value: data.slug ?? '',
                mono: true,
                copyable: true,
              },
              {
                label: 'Title',
                value:
                  data.title !== undefined && data.title !== ''
                    ? data.title
                    : '—',
              },
              {
                label: 'Visibility',
                value: data.visibility ?? '',
                mono: true,
              },
              {
                label: 'Files',
                value: (data.file_count ?? 0).toString(),
                mono: true,
              },
              {
                label: 'Size',
                value: `${formatBytes(data.size_bytes ?? 0)} (${(data.size_bytes ?? 0).toString()} B)`,
              },
              {
                label: 'Created',
                value:
                  data.created_at !== undefined && data.created_at !== ''
                    ? new Date(data.created_at).toLocaleString()
                    : '—',
              },
              {
                label: 'Updated',
                value:
                  data.updated_at !== undefined && data.updated_at !== ''
                    ? new Date(data.updated_at).toLocaleString()
                    : '—',
              },
            ]}
          />
        </Panel>
      )}

      {replaceMode ? (
        <Panel>
          <PanelTitle>Replace contents</PanelTitle>
          <div className='pages-app__form'>
            <FolderDropzone
              value={replaceFiles}
              onFilesChange={setReplaceFiles}
              maxFileBytes={PAGES_LIMITS.maxFileBytes}
              maxTotalBytes={PAGES_LIMITS.maxTotalBytes}
              maxFiles={PAGES_LIMITS.maxFiles}
              helperText='Overwrites every existing file in this site.'
              validationError={
                replaceFiles.length > 0 && !replaceValidation.ok
                  ? (replaceValidation.errors[0] ?? 'Invalid upload')
                  : undefined
              }
            />
            <div className='pages-app__row pages-app__row--inline'>
              <Button
                type='primary'
                danger
                disabled={!replaceValidation.ok}
                loading={replace.isPending}
                onClick={() => {
                  void handleConfirmReplace();
                }}
              >
                Replace
              </Button>
              <Button
                onClick={() => {
                  setReplaceMode(false);
                  setReplaceFiles([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <div className='pages-app__panel-header'>
          <PanelTitle>Files ({files.length.toString()})</PanelTitle>
          <Button
            size='small'
            type='text'
            icon={<ReloadOutlined />}
            onClick={() => {
              void detail.refetch();
            }}
            title='Reload'
          />
        </div>
        {files.length === 0 ? (
          <EmptyState
            title='No files'
            description='This site has no files yet.'
          />
        ) : (
          <div className='pages-app__file-tree'>
            <FileTree
              files={files}
              ariaLabel='Site files'
              onSelect={(path) => {
                window.open(
                  `${shareUrl}/${encodePath(path)}`,
                  '_blank',
                  'noopener'
                );
              }}
            />
          </div>
        )}
      </Panel>
    </>
  );
}
