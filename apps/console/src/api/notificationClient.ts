/**
 * Client for aegis-notify's /api/v2/inbox/* surface. Goes through the
 * vite proxy (`/api/v2/inbox` → 8084 in dev).
 *
 * Server returns InboxItem with the same field names as the library's
 * `AegisNotification` (the backend was designed to make zero adapter
 * code necessary on this side), so we cast the response shape directly.
 */

import type { AegisNotification } from '@OperationsPAI/aegis-ui';

import { apiFetch, apiJson } from './apiClient';

export interface ListInboxResp {
  items: AegisNotification[];
  next_cursor?: string;
  unread_count: number;
}

export interface UnreadCountResp {
  unread_count: number;
}

export interface InboxListParams {
  limit?: number;
  cursor?: string;
  unread_only?: boolean;
  category?: string;
  severity?: string;
}

function qs(params: InboxListParams): string {
  const u = new URLSearchParams();
  if (params.limit !== undefined) {
    u.set('limit', params.limit.toString());
  }
  if (params.cursor) {
    u.set('cursor', params.cursor);
  }
  if (params.unread_only) {
    u.set('unread_only', 'true');
  }
  if (params.category) {
    u.set('category', params.category);
  }
  if (params.severity) {
    u.set('severity', params.severity);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export async function listInbox(
  params: InboxListParams = {},
): Promise<ListInboxResp> {
  return apiJson<ListInboxResp>(`/api/v2/inbox${qs(params)}`);
}

export async function unreadCount(): Promise<UnreadCountResp> {
  return apiJson<UnreadCountResp>('/api/v2/inbox/unread-count');
}

export async function markRead(id: string): Promise<void> {
  await apiFetch(`/api/v2/inbox/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  });
}

export async function markAllRead(): Promise<void> {
  await apiFetch('/api/v2/inbox/read-all', { method: 'POST' });
}

export async function archive(id: string): Promise<void> {
  await apiFetch(`/api/v2/inbox/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  });
}

export interface SubscriptionRow {
  category: string;
  channel: string;
  enabled: boolean;
}

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  // Server returns either `{subscriptions: [...]}` or a plain array
  // depending on serializer; tolerate both.
  const res = await apiJson<SubscriptionRow[] | { subscriptions: SubscriptionRow[] }>(
    '/api/v2/inbox/subscriptions',
  );
  if (Array.isArray(res)) {
    return res;
  }
  return res.subscriptions;
}

export async function setSubscription(row: SubscriptionRow): Promise<void> {
  await apiFetch('/api/v2/inbox/subscriptions', {
    method: 'PUT',
    body: JSON.stringify(row),
  });
}
