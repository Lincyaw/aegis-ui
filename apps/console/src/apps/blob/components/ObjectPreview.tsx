import { type ReactElement, useMemo } from 'react';

import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  ErrorState,
  FilePreview,
  formatBytes,
  type MetadataEntry,
  MetadataList,
  ObjectInspector,
  type ObjectInspectorTab,
  ParquetViewer,
  SkeletonText,
} from '@lincyaw/aegis-ui';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { presignGet } from '../../../api/blobClient';
import type { ObjectActions } from '../hooks/useObjectActions';
import { inferMime, isParquet, lastSegment, type ObjItem } from '../objects';
import { blobKeys } from '../queryKeys';

const PREVIEW_TTL_SECONDS = 600;

interface ObjectPreviewProps {
  bucket: string;
  /** The object to inspect; the inspector is closed while null. */
  item: ObjItem | null;
  actions: ObjectActions;
  onShare: (item: ObjItem) => void;
  onClose: () => void;
}

function summaryEntries(item: ObjItem): MetadataEntry[] {
  return [
    { label: 'Key', value: item.key, mono: true, copyable: true },
    {
      label: 'Size',
      value: `${formatBytes(item.size)} (${item.size.toString()} B)`,
    },
    {
      label: 'Content-Type',
      value: item.contentType ?? '—',
      mono: !!item.contentType,
    },
    {
      label: 'Updated',
      value: `${new Date(item.updatedAt).toLocaleString()} (${item.updatedAt})`,
    },
    ...(item.etag ? [{ label: 'ETag', value: item.etag, mono: true }] : []),
    ...Object.entries(item.metadata ?? {}).map(([k, v]) => ({
      label: k,
      value: v,
      mono: true,
    })),
  ];
}

/** The inspector of one object: its metadata, a preview and, for parquet,
 *  the table viewer, each read through a short-lived signed link. */
export function ObjectPreview({
  bucket,
  item,
  actions,
  onShare,
  onClose,
}: ObjectPreviewProps): ReactElement {
  // The signed URL is the only credential an <img>, <iframe> or the parquet
  // fetcher can carry, so a failed signature is shown rather than worked around.
  const signedUrl = useQuery({
    queryKey: blobKeys.previewUrl(bucket, item?.key ?? ''),
    queryFn: async () => {
      const signed = await presignGet(bucket, {
        key: item?.key ?? '',
        ttl_seconds: PREVIEW_TTL_SECONDS,
      });
      return signed.url;
    },
    enabled: item !== null,
    staleTime: (PREVIEW_TTL_SECONDS / 2) * 1000,
  });

  const tabs = useMemo<ObjectInspectorTab[]>(() => {
    if (!item) {
      return [];
    }
    const signed = (render: (src: string) => ReactElement): ReactElement => {
      if (signedUrl.isError) {
        return (
          <ErrorState
            title='Could not sign a preview link'
            description={errMsg(signedUrl.error)}
          />
        );
      }
      return signedUrl.data === undefined ? (
        <SkeletonText lines={4} />
      ) : (
        render(signedUrl.data)
      );
    };
    const out: ObjectInspectorTab[] = [
      {
        id: 'summary',
        label: 'Summary',
        content: <MetadataList entries={summaryEntries(item)} />,
      },
      {
        id: 'preview',
        label: 'Preview',
        content: signed((src) => (
          <FilePreview
            src={src}
            mimeType={inferMime(item)}
            name={item.key}
            size={item.size}
          />
        )),
      },
    ];
    if (isParquet(item)) {
      out.push({
        id: 'parquet',
        label: 'Parquet',
        content: signed((src) => <ParquetViewer src={src} title={item.key} />),
      });
    }
    return out;
  }, [item, signedUrl.data, signedUrl.error, signedUrl.isError]);

  return (
    <ObjectInspector
      open={item !== null}
      onClose={onClose}
      title={item ? lastSegment(item.key) : ''}
      subtitle={item?.key}
      tabs={tabs}
      defaultTabId={
        item ? (isParquet(item) ? 'parquet' : 'preview') : undefined
      }
      actions={
        item ? (
          <span className='blob-actions'>
            <Button
              size='small'
              icon={<DownloadOutlined />}
              onClick={() => {
                void actions.download(item);
              }}
            >
              Download
            </Button>
            <Button
              size='small'
              icon={<CopyOutlined />}
              onClick={() => {
                void actions.copyUrl(item);
              }}
            >
              Copy URL
            </Button>
            <Button
              size='small'
              icon={<ShareAltOutlined />}
              onClick={() => {
                onShare(item);
              }}
            >
              Share
            </Button>
            <Button
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                actions.remove(item);
              }}
            >
              Delete
            </Button>
          </span>
        ) : null
      }
      width={720}
      defaultMaximized
    />
  );
}
