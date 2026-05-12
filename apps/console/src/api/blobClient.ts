/**
 * Client for aegis-blob's /api/v2/blob/* surface (presign + list +
 * inline get + delete). Goes through the vite proxy
 * (`/api/v2/blob` → 8085 in dev).
 *
 * Some endpoints return DB rows that are *not* json-tagged on the
 * backend (ObjectRecord). Those serialise with PascalCase field names;
 * the typed surface here matches that convention so we don't silently
 * read undefined.
 */

import { apiFetch, apiJson, type ApiFetchOptions } from './apiClient';

const ROOT = '/api/v2/blob';

export interface PresignedRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  expires_at: string;
}

export interface PresignPutReq {
  key?: string;
  content_type?: string;
  content_length?: number;
  entity_kind?: string;
  entity_id?: string;
  metadata?: Record<string, string>;
  ttl_seconds?: number;
}

export interface PresignPutResp {
  object_id: number;
  bucket: string;
  key: string;
  presigned: PresignedRequest;
}

export interface PresignGetReq {
  key: string;
  response_content_type?: string;
  ttl_seconds?: number;
}

/** DB row shape: gorm fields with no json tag → PascalCase on the wire. */
export interface ObjectRow {
  ID: number;
  Bucket: string;
  StorageKey: string;
  SizeBytes: number;
  ContentType: string;
  ETag: string;
  UploadedBy: number | null;
  EntityKind: string;
  EntityID: string;
  Metadata: Record<string, string> | null;
  CreatedAt: string;
  ExpiresAt: string | null;
  DeletedAt: string | null;
}

export interface ListResp {
  items: ObjectRow[];
  next_cursor?: string;
}

export interface BucketSummary {
  name: string;
  driver: string;
  max_object_bytes?: number;
  retention_days?: number;
  public_read?: boolean;
}

export async function listBuckets(): Promise<BucketSummary[]> {
  const res = await apiJson<{ items: BucketSummary[] }>(`${ROOT}/buckets`);
  return res.items;
}

export interface ListParams {
  cursor?: string;
  limit?: number;
  entity_kind?: string;
  entity_id?: string;
}

function buildQuery(p: ListParams): string {
  const u = new URLSearchParams();
  if (p.cursor) {
    u.set('cursor', p.cursor);
  }
  if (p.limit !== undefined) {
    u.set('limit', p.limit.toString());
  }
  if (p.entity_kind) {
    u.set('entity_kind', p.entity_kind);
  }
  if (p.entity_id) {
    u.set('entity_id', p.entity_id);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export async function listObjects(
  bucket: string,
  params: ListParams = {},
): Promise<ListResp> {
  return apiJson<ListResp>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects${buildQuery(params)}`,
  );
}

export async function presignPut(
  bucket: string,
  req: PresignPutReq,
): Promise<PresignPutResp> {
  return apiJson<PresignPutResp>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/presign-put`,
    { method: 'POST', body: JSON.stringify(req) },
  );
}

export async function presignGet(
  bucket: string,
  req: PresignGetReq,
): Promise<PresignedRequest> {
  return apiJson<PresignedRequest>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/presign-get`,
    { method: 'POST', body: JSON.stringify(req) },
  );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await apiFetch(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}

/** Inline GET URL — caller renders as <img>/<video> etc. directly. */
export function inlineUrl(bucket: string, key: string): string {
  return `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
}

/**
 * Upload a file through a presign-put result. Localfs driver returns
 * a URL like /api/v2/blob/raw/<token>; same-origin so we just PUT it.
 * For s3-style absolute URLs, fetch hits the remote directly.
 */
export async function uploadWithPresign(
  presigned: PresignedRequest,
  file: File | Blob,
  init: ApiFetchOptions = {},
): Promise<void> {
  const headers = new Headers(presigned.headers ?? {});
  headers.set('content-type', file.type || 'application/octet-stream');
  const res = await fetch(presigned.url, {
    ...init,
    method: presigned.method,
    body: file,
    headers,
  });
  if (!res.ok) {
    throw new Error(
      `Upload failed: ${res.status.toString()} ${res.statusText}`,
    );
  }
}
