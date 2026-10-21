/** Strips trailing slashes, so an app mounted at `/` has the basePath `''`. */
export function normalizeBasePath(basePath: string): string {
  return basePath.replace(/\/+$/, '');
}

/**
 * Resolves an app-relative path against a basePath. Leading slashes on
 * `rel` are app-root-relative, and an empty `rel` is the app root (`/` for
 * an app mounted at the root).
 */
export function joinPath(basePath: string, rel: string): string {
  const base = normalizeBasePath(basePath);
  const path = rel.replace(/^\/+/, '');
  return path ? `${base}/${path}` : base || '/';
}
