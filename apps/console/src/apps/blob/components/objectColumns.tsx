import {
  CaretDownOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  Chip,
  type DataTableColumn,
  DropdownMenu,
  formatBytes,
  MonoValue,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

import { lastSegment, type ObjItem } from '../objects';

export interface ObjectActions {
  preview: (item: ObjItem) => void;
  download: (item: ObjItem) => void;
  copyUrl: (item: ObjItem) => void;
  share: (item: ObjItem) => void;
  remove: (item: ObjItem) => void;
}

export function objectColumns(
  actions: ObjectActions
): Array<DataTableColumn<ObjItem>> {
  return [
    {
      key: 'key',
      header: 'Name',
      render: (row) => <MonoValue size='sm'>{lastSegment(row.key)}</MonoValue>,
    },
    {
      key: 'size',
      header: 'Size',
      numeric: true,
      width: 100,
      render: (row) => formatBytes(row.size),
    },
    {
      key: 'type',
      header: 'Type',
      width: 200,
      render: (row) =>
        row.contentType ? <Chip tone='ghost'>{row.contentType}</Chip> : '—',
    },
    {
      key: 'updated',
      header: 'Updated',
      width: 180,
      render: (row) => <TimeDisplay value={row.updatedAt} />,
    },
    {
      key: 'actions',
      header: '',
      kind: 'actions',
      width: 200,
      render: (row) => (
        <DropdownMenu
          align='right'
          trigger={
            <Button size='small' type='text'>
              Actions <CaretDownOutlined />
            </Button>
          }
          items={[
            {
              key: 'preview',
              label: 'Preview',
              icon: <EyeOutlined />,
              onClick: () => {
                actions.preview(row);
              },
            },
            {
              key: 'download',
              label: 'Download',
              icon: <DownloadOutlined />,
              onClick: () => {
                actions.download(row);
              },
            },
            {
              key: 'copy-url',
              label: 'Copy URL',
              icon: <CopyOutlined />,
              onClick: () => {
                actions.copyUrl(row);
              },
            },
            {
              key: 'share',
              label: 'Share',
              icon: <ShareAltOutlined />,
              onClick: () => {
                actions.share(row);
              },
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                actions.remove(row);
              },
            },
          ]}
        />
      ),
    },
  ];
}
