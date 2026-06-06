/**
 * Client for the aegis admin audit surface (`/api/v2/system/audit`).
 * Hand-rolled over `apiClient`'s fetch helpers, mirroring `iamClient.ts`.
 *
 * List endpoints reject `size < 10` with a 400, so callers must page with
 * `size >= 10`.
 */
import { apiJson } from './apiClient';

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface Paginated<T> {
  items: T[] | null;
  pagination?: { total?: number };
}

export interface AuditLog {
  id: number;
  action: string;
  ip_address: string;
  duration: number;
  user_agent: string;
  user_id?: number;
  username?: string;
  resource_id?: number;
  resource?: string;
  state: string;
  status: string;
  created_at: string;
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

export async function listAuditLogs(
  p: PageReq = {}
): Promise<{ items: AuditLog[]; total: number }> {
  const env = await apiJson<Envelope<Paginated<AuditLog>>>(
    `/api/v2/system/audit${pageQs(p)}`
  );
  const items = env.data.items ?? [];
  return { items, total: env.data.pagination?.total ?? items.length };
}
