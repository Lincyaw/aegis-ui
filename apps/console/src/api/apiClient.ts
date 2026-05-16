/**
 * Tiny shared fetch wrapper for the standalone aegis-* microservices
 * (SSO admin, notification inbox, blob). Pulls the access token from
 * the SSO session store and attaches `Authorization: Bearer …`.
 *
 * Each surface routes through its own vite proxy prefix (see
 * vite.config.ts), so callers stay on relative paths.
 */
import { readTokens } from '../auth/tokenStore';
import { gatewayUrlFor } from '../config/runtime';

export interface ApiFetchOptions extends RequestInit {
  /** Skip Authorization header (e.g. for the SSO token endpoint). */
  anonymous?: boolean;
  /** Treat 404 as `null` instead of throwing. */
  tolerateMissing?: boolean;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function readError(
  res: Response
): Promise<{ body: unknown; msg: string }> {
  const text = await res.text().catch(() => '');
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    /* keep text */
  }
  const msg =
    typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message: unknown }).message)
      : text || res.statusText || `HTTP ${res.status.toString()}`;
  return { body, msg };
}

export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const { anonymous, tolerateMissing, headers, ...rest } = init;
  const merged = new Headers(headers ?? undefined);
  if (!anonymous) {
    const tokens = readTokens();
    if (tokens) {
      merged.set('authorization', `Bearer ${tokens.accessToken}`);
    }
  }
  if (
    !merged.has('content-type') &&
    rest.body !== undefined &&
    !(rest.body instanceof FormData) &&
    !(rest.body instanceof Blob) &&
    !(rest.body instanceof ArrayBuffer)
  ) {
    merged.set('content-type', 'application/json');
  }
  const res = await fetch(gatewayUrlFor(path), { ...rest, headers: merged });
  if (res.ok) {
    return res;
  }
  if (tolerateMissing && res.status === 404) {
    return res;
  }
  const { body, msg } = await readError(res);
  throw new ApiError(res.status, body, msg);
}

export async function apiJson<T>(
  path: string,
  init: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiFetch(path, init);
  return (await res.json()) as T;
}
