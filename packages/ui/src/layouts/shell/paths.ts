/** Strips trailing slashes, so an app mounted at `/` has the basePath `''`. */
export function normalizeBasePath(basePath: string): string {
  return basePath.replace(/\/+$/, '');
}

/**
 * Resolves an app-relative path against a basePath. Leading slashes on
 * `rel` are app-root-relative, and an empty `rel` is the app root (`/` for
 * an app mounted at the root). A query string on `rel` is kept and appended
 * after the joined path, so `?x=1` resolves to the app root with that query.
 */
export function joinPath(basePath: string, rel: string): string {
  const base = normalizeBasePath(basePath);
  const path = pathOf(rel).replace(/^\/+/, '');
  const query = rel.slice(pathOf(rel).length);
  return `${path ? `${base}/${path}` : base || '/'}${query}`;
}

/** The path part of an app-relative link, without its query string. */
export function pathOf(rel: string): string {
  const queryStart = rel.indexOf('?');
  return queryStart === -1 ? rel : rel.slice(0, queryStart);
}
