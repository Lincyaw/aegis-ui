import { Chip, type DataTableColumn, MonoValue } from '@lincyaw/aegis-ui';

import type { GalleryRunRow } from './fixtures';

export const GALLERY_RUN_COLUMNS: Array<DataTableColumn<GalleryRunRow>> = [
  {
    key: 'id',
    header: 'Run',
    render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
  },
  { key: 'service', header: 'Service', render: (row) => row.service },
  {
    key: 'duration',
    header: 'Duration',
    numeric: true,
    render: (row) => `${row.duration} s`,
  },
  {
    key: 'state',
    header: 'State',
    align: 'center',
    render: (row) => (
      <Chip
        tone={
          row.state === 'failed'
            ? 'warning'
            : row.state === 'running'
              ? 'ink'
              : 'default'
        }
      >
        {row.state}
      </Chip>
    ),
  },
];
