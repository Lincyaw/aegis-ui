import type { DriverListResult } from '../../api/blobClient';

export interface ObjItem {
  key: string;
  size: number;
  contentType?: string;
  updatedAt: string;
  etag?: string;
  metadata?: Record<string, string>;
}

const PARQUET_RE = /\.parquet$/i;

export function toObjItem(item: DriverListResult['items'][number]): ObjItem {
  return {
    key: item.key,
    size: item.size_bytes,
    contentType: item.content_type,
    updatedAt: item.updated_at,
    etag: item.etag,
    metadata: item.metadata,
  };
}

export function isParquet(item: ObjItem): boolean {
  return (
    PARQUET_RE.test(item.key) ||
    item.contentType === 'application/parquet' ||
    item.contentType === 'application/x-parquet'
  );
}

export function inferMime(item: ObjItem): string | undefined {
  if (item.contentType && item.contentType !== 'application/octet-stream') {
    return item.contentType;
  }
  if (isParquet(item)) {
    return 'application/x-parquet';
  }
  return undefined;
}

export function lastSegment(key: string): string {
  const idx = key.lastIndexOf('/');
  return idx === -1 ? key : key.slice(idx + 1);
}

/** Presigned URLs come back relative to the API origin; links shared outside the console need the full URL. */
export function absoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `${window.location.origin}${url}`;
}
