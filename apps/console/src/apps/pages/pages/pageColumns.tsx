import type { ReactNode } from 'react';

import {
  Chip,
  type DataTableColumn,
  formatBytes,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import type { PagesPageSiteResponse } from '@lincyaw/portal';

import type { PageVisibility } from '../api/pages-client';

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
      numeric: true,
      width: 80,
      render: (row) => (row.file_count ?? 0).toString(),
    },
    {
      key: 'size',
      header: 'Size',
      numeric: true,
      width: 100,
      render: (row) => formatBytes(row.size_bytes ?? 0),
    },
    {
      key: 'updated',
      header: 'Updated',
      width: 180,
      render: (row) =>
        row.updated_at !== undefined && row.updated_at !== '' ? (
          <TimeDisplay value={row.updated_at} />
        ) : (
          '—'
        ),
    },
    actionsColumn,
  ];
}
