import type { AegisAuthUser, AuthStatus } from '../../auth';
import { normalizeBasePath } from './paths';
import type { AegisApp } from './types';

/**
 * Whether the user may see and open `app`: apps with `requiresAuth: false`
 * are open to everyone, the rest need a signed-in user holding one of the
 * `requiredRoles`, when the app lists any. `hidden` is not part of the
 * rule; it only keeps an app out of the launcher.
 */
export function isAppVisible(
  app: AegisApp,
  status: AuthStatus,
  user: AegisAuthUser | null,
): boolean {
  if (app.requiresAuth === false) {
    return true;
  }
  if (status !== 'authenticated') {
    return false;
  }
  if (!app.requiredRoles || app.requiredRoles.length === 0) {
    return true;
  }
  const userRoles = user?.roles ?? [];
  return app.requiredRoles.some((r) => userRoles.includes(r));
}

/** The app whose basePath is the longest prefix of `pathname`. */
export function findActiveApp(
  apps: AegisApp[],
  pathname: string,
): AegisApp | undefined {
  const candidates = apps
    .filter((app) => {
      const base = normalizeBasePath(app.basePath);
      return pathname === base || pathname.startsWith(`${base}/`);
    })
    .sort(
      (a, b) =>
        normalizeBasePath(b.basePath).length -
        normalizeBasePath(a.basePath).length,
    );
  return candidates[0];
}

export function assertUniqueBasePaths(apps: AegisApp[]): void {
  const seen = new Map<string, string>();
  for (const app of apps) {
    const key = normalizeBasePath(app.basePath);
    const prev = seen.get(key);
    if (prev) {
      console.error(
        `AegisShell: duplicate basePath "${key}" on apps "${prev}" and "${app.id}". ` +
          `Routing will collide — give each app a unique basePath.`,
      );
    }
    seen.set(key, app.id);
  }
}
