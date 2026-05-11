import { useCallback } from 'react';

import { type NavigateOptions, useNavigate } from 'react-router-dom';

import { useActiveApp } from './activeAppContext';

/**
 * Resolves an app-relative path against the active app's `basePath`.
 *
 * - A leading `/` is treated as app-root-relative: `link('/projects')` and
 *   `link('projects')` both produce `${basePath}/projects`.
 * - An empty string resolves to the app root.
 * - Fully qualified URLs (http://, mailto:) and hash-only links pass
 *   through untouched.
 *
 * Use this inside an AegisShell-mounted app instead of hardcoding the
 * basePath, so the app stays portable if it gets re-mounted elsewhere.
 */
export function useAppHref(): (to: string) => string {
  const { basePath } = useActiveApp();
  return useCallback(
    (to: string) => {
      if (
        to === '' ||
        to.startsWith('http://') ||
        to.startsWith('https://') ||
        to.startsWith('mailto:') ||
        to.startsWith('#')
      ) {
        return to === '' ? basePath || '/' : to;
      }
      const rel = to.startsWith('/') ? to.slice(1) : to;
      const base = basePath || '';
      return rel === '' ? base || '/' : `${base}/${rel}`;
    },
    [basePath],
  );
}

/**
 * Drop-in replacement for `useNavigate` that resolves paths against the
 * active app's `basePath`. App code should never write absolute portal
 * paths like `navigate('/projects')` — the shell decides where each app
 * is mounted.
 */
export function useAppNavigate(): (
  to: string,
  options?: NavigateOptions,
) => void {
  const navigate = useNavigate();
  const href = useAppHref();
  return useCallback(
    (to: string, options?: NavigateOptions) => {
      navigate(href(to), options);
    },
    [navigate, href],
  );
}
