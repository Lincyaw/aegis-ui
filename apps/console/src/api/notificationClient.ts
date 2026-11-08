/**
 * Client for aegis-notify's /api/v2/inbox/* surface. Goes through the
 * vite proxy (`/api/v2/inbox` → 8084 in dev).
 *
 * Server returns InboxItem with the same field names as the library's
 * `AegisNotification`. The list and unread-count responses are checked
 * against that shape here; one that doesn't match rejects as a failed
 * request does, so it never reaches the inbox's render.
 */
import type { AegisNotification } from '@lincyaw/aegis-ui';

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

type JsonObject = Record<string, unknown>;

const SEVERITIES: ReadonlyArray<AegisNotification['severity']> = [
  'info',
  'success',
  'warning',
  'error',
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed(what: string): Error {
  return new Error(`The inbox sent an unexpected response: ${what}.`);
}

function optionalString(
  item: JsonObject,
  field: string,
  at: string
): string | undefined {
  const value = item[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw malformed(`${at}.${field} is not text`);
  }
  return value;
}

function parseItem(raw: unknown, index: number): AegisNotification {
  const at = `items[${index.toString()}]`;
  if (!isObject(raw)) {
    throw malformed(`${at} is not an object`);
  }
  const { id, title, timestamp, read, severity } = raw;
  if (typeof id !== 'string' || id === '') {
    throw malformed(`${at}.id is missing`);
  }
  if (typeof title !== 'string') {
    throw malformed(`${at}.title is not text`);
  }
  if (typeof timestamp !== 'string') {
    throw malformed(`${at}.timestamp is not text`);
  }
  if (typeof read !== 'boolean') {
    throw malformed(`${at}.read is not true or false`);
  }
  const knownSeverity = SEVERITIES.find((s) => s === severity);
  if (severity !== undefined && severity !== null && !knownSeverity) {
    throw malformed(`${at}.severity is not a known severity`);
  }
  return {
    id,
    title,
    timestamp,
    read,
    body: optionalString(raw, 'body', at),
    to: optionalString(raw, 'to', at),
    category: optionalString(raw, 'category', at),
    severity: knownSeverity,
    actor: optionalString(raw, 'actor', at),
  };
}

function parseUnreadCount(body: JsonObject): number {
  const count = body.unread_count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw malformed('unread_count is not a count');
  }
  return count;
}

export async function listInbox(
  params: InboxListParams = {}
): Promise<ListInboxResp> {
  const body = await apiJson<unknown>(`/api/v2/inbox${qs(params)}`);
  if (!isObject(body)) {
    throw malformed('the list is not an object');
  }
  // An empty Go slice can arrive as null.
  const items = body.items === null ? [] : body.items;
  if (!Array.isArray(items)) {
    throw malformed('items is not a list');
  }
  const cursor = body.next_cursor;
  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    throw malformed('next_cursor is not text');
  }
  return {
    items: items.map(parseItem),
    next_cursor: cursor ?? undefined,
    unread_count: parseUnreadCount(body),
  };
}

export async function unreadCount(): Promise<UnreadCountResp> {
  const body = await apiJson<unknown>('/api/v2/inbox/unread-count');
  if (!isObject(body)) {
    throw malformed('the unread count is not an object');
  }
  return { unread_count: parseUnreadCount(body) };
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
  // Server returns a bare `{items: [...]}`, a `{subscriptions: [...]}`, or a
  // plain array depending on serializer; tolerate all three.
  const res = await apiJson<
    | SubscriptionRow[]
    | {
        items?: SubscriptionRow[] | null;
        subscriptions?: SubscriptionRow[] | null;
      }
  >('/api/v2/inbox/subscriptions');
  if (Array.isArray(res)) {
    return res;
  }
  return res.items ?? res.subscriptions ?? [];
}

export async function setSubscription(row: SubscriptionRow): Promise<void> {
  await apiFetch('/api/v2/inbox/subscriptions', {
    method: 'PUT',
    body: JSON.stringify(row),
  });
}
