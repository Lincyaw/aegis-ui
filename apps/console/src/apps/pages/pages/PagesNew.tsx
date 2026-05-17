import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  FolderDropzone,
  PageHeader,
  Panel,
  PanelTitle,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Button, Input, Radio } from 'antd';

import {
  PAGES_LIMITS,
  type PageVisibility,
  useCreatePage,
} from '../api/pages-client';
import '../pages-app.css';
import { fileRelPath, humanBytes, validateUpload } from './helpers';

export default function PagesNew() {
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  const { message: msg } = AntdApp.useApp();
  const create = useCreatePage();

  const [files, setFiles] = useState<File[]>([]);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] =
    useState<PageVisibility>('public_unlisted');

  const validation = useMemo(
    () => validateUpload(files, slug.trim() === '' ? undefined : slug.trim()),
    [files, slug],
  );

  const handleSubmit = async (): Promise<void> => {
    if (!validation.ok) {
      return;
    }
    try {
      const trimmedSlug = slug.trim();
      const trimmedTitle = title.trim();
      const res = await create.mutateAsync({
        files,
        slug: trimmedSlug === '' ? undefined : trimmedSlug,
        title: trimmedTitle === '' ? undefined : trimmedTitle,
        visibility,
      });
      void msg.success(`Page "${res.slug ?? ''}" created`);
      if (res.id !== undefined) {
        navigate(`${basePath}/${res.id.toString()}`);
      }
    } catch (e) {
      void msg.error(
        `Create failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
    }
  };

  const summary =
    files.length > 0 ? (
      <>
        {files.map((f, i) => {
          const tooBig = f.size > PAGES_LIMITS.maxFileBytes;
          const cls = tooBig
            ? 'pages-app__file-tree-row pages-app__file-tree-row--invalid'
            : 'pages-app__file-tree-row';
          return (
            <div key={`${fileRelPath(f)}-${i.toString()}`} className={cls}>
              <span>{fileRelPath(f)}</span>
              <span>{humanBytes(f.size)}</span>
            </div>
          );
        })}
      </>
    ) : null;

  const blockingError =
    files.length > 0 && !validation.ok
      ? (validation.errors[0] ?? 'Invalid upload')
      : undefined;

  return (
    <>
      <PageHeader
        title='New page'
        description='Upload a folder of markdown (and any companion images / CSS / JSON). At least one .md is required.'
      />

      <Panel>
        <div className='pages-app__form'>
          <div>
            <PanelTitle>Files</PanelTitle>
            <FolderDropzone
              value={files}
              onFilesChange={setFiles}
              maxFileBytes={PAGES_LIMITS.maxFileBytes}
              maxTotalBytes={PAGES_LIMITS.maxTotalBytes}
              maxFiles={PAGES_LIMITS.maxFiles}
              helperText='10 MiB per file · 50 MiB total · 200 files max'
              validationError={blockingError}
              summary={summary}
            />
          </div>

          <div>
            <label className='pages-app__label'>Slug (optional)</label>
            <Input
              placeholder='my-page'
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
              }}
            />
            <div className='pages-app__hint pages-app__hint--inline'>
              Lowercase letters, digits, and hyphens. Auto-derived from the
              first filename if left blank.
            </div>
          </div>

          <div>
            <label className='pages-app__label'>Title (optional)</label>
            <Input
              placeholder='Display title'
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
              <Radio value='public_listed'>
                Public — listed in the public catalogue
              </Radio>
              <Radio value='public_unlisted'>
                Public — unlisted, only people with the link can read
              </Radio>
              <Radio value='private'>Private — only you</Radio>
            </Radio.Group>
          </div>

          <div className='pages-app__row pages-app__row--inline'>
            <Button
              type='primary'
              disabled={!validation.ok}
              loading={create.isPending}
              onClick={() => {
                void handleSubmit();
              }}
            >
              Create page
            </Button>
            <Button
              onClick={() => {
                navigate(basePath);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
