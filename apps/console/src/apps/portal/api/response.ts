import { isAxiosError } from 'axios';

/** Every list hook returns this: the page of items and the count across all pages. */
export interface ListResult<T> {
  items: T[];
  total: number;
}

interface ListPayload<T> {
  items?: T[] | null;
  pagination?: { total?: number };
}

export function toList<T>(
  payload: ListPayload<T> | undefined,
  what: string
): ListResult<T> {
  const page = required(payload, what);
  const items = page.items ?? [];
  return { items, total: page.pagination?.total ?? items.length };
}

/** A list endpoint that returns every item at once. */
export function wholeList<T>(
  items: T[] | null | undefined,
  what: string
): ListResult<T> {
  if (items === undefined) {
    throw new Error(`The server returned no ${what}.`);
  }
  const all = items ?? [];
  return { items: all, total: all.length };
}

/** The value a detail endpoint returned, or an error when it returned none. */
export function required<T>(data: T | undefined, what: string): T {
  if (data === undefined) {
    throw new Error(`The server returned no ${what}.`);
  }
  return data;
}

export function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
