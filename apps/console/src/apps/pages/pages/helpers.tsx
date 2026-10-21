import type { ReactNode } from 'react';

import {
  Chip,
  type DataTableColumn,
  formatBytes,
  MonoValue,
} from '@lincyaw/aegis-ui';
import type { PagesPageSiteResponse } from '@lincyaw/portal';

import {
  fileRelPath,
  PAGES_LIMITS,
  type PageVisibility,
} from '../api/pages-client';

export function visibilityTone(
  v: PageVisibility | string | undefined
): 'ink' | 'default' | 'ghost' {
  switch (v) {
    case 'public_listed':
      return 'ink';
    case 'public_unlisted':
      return 'default';
    case 'private':
      return 'ghost';
    default:
      return 'ghost';
  }
}

export interface UploadValidation {
  ok: boolean;
  errors: string[];
}

// File-count and size caps are enforced by FolderDropzone before files
// reach page state, so only the checks it can't make live here.
export function validateUpload(
  files: File[],
  slug: string | undefined
): UploadValidation {
  const errors: string[] = [];
  if (files.length === 0) {
    errors.push('Select at least one file.');
  } else if (!files.some((f) => /\.md$/i.test(fileRelPath(f)))) {
    errors.push('At least one .md file is required.');
  }
  if (
    slug !== undefined &&
    slug !== '' &&
    !PAGES_LIMITS.slugPattern.test(slug)
  ) {
    errors.push(
      'Slug must match ^[a-z0-9][a-z0-9-]{0,62}$ (lowercase, digits, hyphens).'
    );
  }
  return { ok: errors.length === 0, errors };
}

export function pageColumns(
  renderSlug: (row: PagesPageSiteResponse) => ReactNode,
  actionsColumn: DataTableColumn<PagesPageSiteResponse>
): Array<DataTableColumn<PagesPageSiteResponse>> {
  return [
    { key: 'slug', header: 'Slug', render: renderSlug },
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
        <MonoValue size='sm'>{formatBytes(row.size_bytes ?? 0)}</MonoValue>
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
    actionsColumn,
  ];
}

export function pagesUploadHelperText(): string {
  return `${formatBytes(PAGES_LIMITS.maxFileBytes)} per file · ${formatBytes(PAGES_LIMITS.maxTotalBytes)} total · ${PAGES_LIMITS.maxFiles.toString()} files max`;
}
