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
import { apiFetch, type ApiFetchOptions, apiJson } from './apiClient';

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
  params: ListParams = {}
): Promise<ListResp> {
  return apiJson<ListResp>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects${buildQuery(params)}`
  );
}

export async function presignPut(
  bucket: string,
  req: PresignPutReq
): Promise<PresignPutResp> {
  return apiJson<PresignPutResp>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/presign-put`,
    { method: 'POST', body: JSON.stringify(req) }
  );
}

export async function presignGet(
  bucket: string,
  req: PresignGetReq
): Promise<PresignedRequest> {
  return apiJson<PresignedRequest>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/presign-get`,
    { method: 'POST', body: JSON.stringify(req) }
  );
}

/** Encode a key as a multi-segment URL path. Backend routes use gin's *key
 *  wildcard, so slashes must remain literal — only encode each segment. */
function encodeKeyPath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await apiFetch(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects/${encodeKeyPath(key)}`,
    { method: 'DELETE' }
  );
}

/** Inline GET URL — caller renders as <img>/<video> etc. directly. */
export function inlineUrl(bucket: string, key: string): string {
  return `${ROOT}/buckets/${encodeURIComponent(bucket)}/objects/${encodeKeyPath(key)}`;
}

export interface CopyObjectReq {
  src: string;
  dst: string;
  delete_src?: boolean;
}

export async function copyObject(
  bucket: string,
  req: CopyObjectReq
): Promise<void> {
  await apiJson<unknown>(`${ROOT}/buckets/${encodeURIComponent(bucket)}/copy`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export interface BatchDeleteResult {
  deleted: string[];
  failed: Array<{ key: string; error: string }>;
}

export async function batchDelete(
  bucket: string,
  keys: string[]
): Promise<BatchDeleteResult> {
  return apiJson<BatchDeleteResult>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/delete-batch`,
    { method: 'POST', body: JSON.stringify({ keys }) }
  );
}

/** Stream the server-side zip archive of the selected keys. Drives an
 *  anchor click so the browser handles the file save with the right
 *  filename. */
export async function downloadZip(
  bucket: string,
  keys: string[],
  archiveName?: string
): Promise<void> {
  const res = await apiFetch(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/zip`,
    {
      method: 'POST',
      body: JSON.stringify({ keys, archive_name: archiveName }),
      headers: { 'content-type': 'application/json' },
    }
  );
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = archiveName ?? `${bucket}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface CreateBucketReq {
  name: string;
  driver: string;
  max_object_bytes?: number;
  retention_days?: number;
  public_read?: boolean;
}

export async function createBucket(
  req: CreateBucketReq
): Promise<BucketSummary> {
  return apiJson<BucketSummary>(`${ROOT}/buckets`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Driver-level list (storage source-of-truth). Supports prefix/delimiter for
 *  hierarchical browsing — `common_prefixes` carries the sub-directories at
 *  the current level. */
export interface DriverListResult {
  items: Array<{
    key: string;
    size_bytes: number;
    content_type?: string;
    etag?: string;
    updated_at: string;
    metadata?: Record<string, string>;
  }>;
  common_prefixes?: string[];
  next_continuation_token?: string;
  is_truncated?: boolean;
}

export interface DriverListParams {
  prefix?: string;
  delimiter?: string;
  continuation_token?: string;
  max_keys?: number;
}

export async function driverList(
  bucket: string,
  params: DriverListParams = {}
): Promise<DriverListResult> {
  const u = new URLSearchParams();
  if (params.prefix) {
    u.set('prefix', params.prefix);
  }
  if (params.delimiter) {
    u.set('delimiter', params.delimiter);
  }
  if (params.continuation_token) {
    u.set('continuation_token', params.continuation_token);
  }
  if (params.max_keys !== undefined) {
    u.set('max_keys', params.max_keys.toString());
  }
  const q = u.toString();
  const raw = await apiJson<DriverListResult>(
    `${ROOT}/buckets/${encodeURIComponent(bucket)}/object-list${q ? `?${q}` : ''}`,
  );
  return {
    ...raw,
    items: raw.items ?? [],
    common_prefixes: raw.common_prefixes ?? [],
  };
}

/* ── Local share registry ────────────────────────────────────────────
 *
 * Backend doesn't persist presigned URLs — once issued, they're stateless
 * until TTL expires. We keep a per-browser registry in localStorage so the
 * Shares page can show "still-live" links and let the user copy them again.
 * "Revoke" is best-effort (drops from the registry only — the URL itself
 * keeps working until expiry).
 */

const SHARE_STORAGE_KEY = 'aegis-blob:shares';

export interface ShareRecord {
  id: string;
  bucket: string;
  key: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  asAttachment?: boolean;
}

export function readShares(): ShareRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as ShareRecord[];
  } catch {
    return [];
  }
}

function writeShares(records: ShareRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(records));
}

export function recordShare(rec: ShareRecord): void {
  const all = readShares().filter((r) => r.id !== rec.id);
  all.unshift(rec);
  writeShares(all);
}

export function forgetShare(id: string): void {
  writeShares(readShares().filter((r) => r.id !== id));
}

export function pruneExpiredShares(): void {
  const now = Date.now();
  writeShares(
    readShares().filter((r) => new Date(r.expiresAt).getTime() > now)
  );
}

/**
 * Upload a file through a presign-put result. Localfs driver returns
 * a URL like /api/v2/blob/raw/<token>; same-origin so we just PUT it.
 * For s3-style absolute URLs, fetch hits the remote directly.
 */
export async function uploadWithPresign(
  presigned: PresignedRequest,
  file: File | Blob,
  init: ApiFetchOptions = {}
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
      `Upload failed: ${res.status.toString()} ${res.statusText}`
    );
  }
}
