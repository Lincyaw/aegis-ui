/**
 * Client for the aegis admin audit surface (`/api/v2/system/audit`).
 * Hand-rolled over `apiClient`'s fetch helpers, mirroring `iamClient.ts`.
 *
 * List endpoints reject `size < 10` with a 400, so callers must page with
 * `size >= 10`.
 */
import {
  apiJson,
  type Envelope,
  type Paginated,
  normalizeList,
  type PageReq,
  pageQs,
} from './apiClient';

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

export async function listAuditLogs(
  p: PageReq = {}
): Promise<{ items: AuditLog[]; total: number }> {
  const env = await apiJson<Envelope<Paginated<AuditLog>>>(
    `/api/v2/system/audit${pageQs(p)}`
  );
  return normalizeList(env.data);
}
