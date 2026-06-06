/**
 * Client for the aegis API-key surface (`/api/v2/api-keys`). The generated
 * `@lincyaw/portal` SDK only covers a subset of v2 surfaces, so this
 * hand-rolled module mirrors `iamClient.ts` over `apiClient`'s fetch helpers.
 *
 * List endpoints reject `size < 10` with a 400, so callers must page with
 * `size >= 10`.
 */
import { apiFetch, apiJson } from './apiClient';

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface Paginated<T> {
  items: T[] | null;
  pagination?: { total?: number };
}

/** 1 = enabled, 0 = disabled, -1 = deleted/revoked. */
export type ApiKeyStatus = 1 | 0 | -1;

export interface ApiKey {
  id: number;
  name: string;
  description?: string;
  key_id: string;
  scopes?: string[] | null;
  status: ApiKeyStatus;
  revoked_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key_secret: string;
}

export interface CreateApiKeyReq {
  name: string;
  description?: string;
  scopes?: string[];
  expires_at?: string;
}

export interface PageReq {
  page?: number;
  size?: number;
}

const MIN_SIZE = 10;

function pageQs(p: PageReq): string {
  const u = new URLSearchParams();
  u.set('page', String(p.page ?? 1));
  u.set('size', String(Math.max(p.size ?? MIN_SIZE, MIN_SIZE)));
  return `?${u.toString()}`;
}

export async function listApiKeys(
  p: PageReq = {}
): Promise<{ items: ApiKey[]; total: number }> {
  const env = await apiJson<Envelope<Paginated<ApiKey>>>(
    `/api/v2/api-keys${pageQs(p)}`
  );
  const items = env.data.items ?? [];
  return { items, total: env.data.pagination?.total ?? items.length };
}

export async function createApiKey(
  req: CreateApiKeyReq
): Promise<ApiKeyWithSecret> {
  const env = await apiJson<Envelope<ApiKeyWithSecret>>('/api/v2/api-keys', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return env.data;
}

export async function rotateApiKey(id: number): Promise<ApiKeyWithSecret> {
  const env = await apiJson<Envelope<ApiKeyWithSecret>>(
    `/api/v2/api-keys/${String(id)}/rotate`,
    { method: 'POST' }
  );
  return env.data;
}

export async function disableApiKey(id: number): Promise<void> {
  await apiFetch(`/api/v2/api-keys/${String(id)}/disable`, { method: 'POST' });
}

export async function enableApiKey(id: number): Promise<void> {
  await apiFetch(`/api/v2/api-keys/${String(id)}/enable`, { method: 'POST' });
}

export async function revokeApiKey(id: number): Promise<void> {
  await apiFetch(`/api/v2/api-keys/${String(id)}/revoke`, { method: 'POST' });
}

export async function deleteApiKey(id: number): Promise<void> {
  await apiFetch(`/api/v2/api-keys/${String(id)}`, { method: 'DELETE' });
}
