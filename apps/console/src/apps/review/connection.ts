/**
 * Where the Review sub-app reads its data, and who is reviewing.
 *
 * The sub-app owns its backend URL. An empty URL means this console's own
 * origin: in development the Vite dev server proxies `/api/review` to
 * `VITE_REVIEW_API_TARGET` (default `http://127.0.0.1:8768`), so the https
 * dev server reaches a local review server without mixed content.
 *
 * Precedence: localStorage → VITE_REVIEW_API_URL → '' in development,
 * `http://localhost:8768` in a build.
 */
import type { ReviewStrings } from './locale/strings';

export type SourceMode = 'server' | 'static';

export interface ReviewConnection {
  /** Base URL without a trailing slash; '' for this console's origin. */
  url: string;
  mode: SourceMode;
  reviewer: string;
}

const URL_KEY = 'aegis.review.url';
const MODE_KEY = 'aegis.review.mode';
const REVIEWER_KEY = 'aegis.review.reviewer';
const ADVANCE_KEY = 'aegis.review.advance';

export const DEFAULT_PROXY_TARGET = 'http://127.0.0.1:8768';

export function defaultUrl(): string {
  const fromEnv = import.meta.env.VITE_REVIEW_API_URL;
  if (typeof fromEnv === 'string') {
    return trimUrl(fromEnv);
  }
  return import.meta.env.DEV ? '' : 'http://localhost:8768';
}

export function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Reviewer names become a path segment and a file name on the server. */
export const REVIEWER_PATTERN = /^[A-Za-z0-9._-]+$/;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the session keeps the value.
  }
}

export function loadConnection(): ReviewConnection {
  const url = read(URL_KEY);
  const mode = read(MODE_KEY);
  return {
    url: url === null ? defaultUrl() : trimUrl(url),
    mode: mode === 'static' ? 'static' : 'server',
    reviewer: read(REVIEWER_KEY) ?? '',
  };
}

export function saveConnection(next: ReviewConnection): void {
  write(URL_KEY, trimUrl(next.url));
  write(MODE_KEY, next.mode);
  write(REVIEWER_KEY, next.reviewer.trim());
}

export function loadAdvance(): boolean {
  return read(ADVANCE_KEY) === '1';
}

export function saveAdvance(value: boolean): void {
  write(ADVANCE_KEY, value ? '1' : '0');
}

/** How the URL reads to a person: the proxy target when it is empty. */
export function describeUrl(
  url: string,
  s: Pick<ReviewStrings, 'thisConsole' | 'thisConsoleProxy'>
): string {
  if (url !== '') {
    return url;
  }
  return import.meta.env.DEV
    ? s.thisConsoleProxy(
        import.meta.env.VITE_REVIEW_API_TARGET ?? DEFAULT_PROXY_TARGET
      )
    : s.thisConsole;
}
