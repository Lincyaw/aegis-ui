import type { ReactNode } from 'react';

import { Navigate, type RouteObject } from 'react-router-dom';

import type { AegisAuthUser, AuthContextValue } from '../../auth';
import { PageWrapper } from '../PageWrapper';
import { AppRoutes } from './AppRoutes';
import { AuthRequiredCard } from './AuthRequiredCard';
import { isAppVisible } from './apps';
import { normalizeBasePath } from './paths';
import type { AegisApp, AegisShellProps } from './types';

interface RouteTreeOptions {
  apps: AegisApp[];
  rootRoutes: NonNullable<AegisShellProps['rootRoutes']>;
  fallbackPath?: string;
  notFoundElement?: ReactNode;
  auth: AuthContextValue<AegisAuthUser>;
}

export interface RouteTree {
  routes: RouteObject[];
  /** The top-level routes that render without the shell chrome. */
  bareRoutes: ReadonlySet<RouteObject>;
}

/**
 * The shell's route tree: bare root routes, root routes and every app under
 * its basePath, each page in a PageWrapper, then the not-found fallback.
 */
export function buildRouteTree({
  apps,
  rootRoutes,
  fallbackPath,
  notFoundElement,
  auth,
}: RouteTreeOptions): RouteTree {
  const signIn = auth.signIn
    ? () => {
        void auth.signIn?.({});
      }
    : undefined;

  const appRoutes = apps.map(
    (app): RouteObject => ({
      path: `${normalizeBasePath(app.basePath)}/*`,
      element: (
        <PageWrapper>
          {isAppVisible(app, auth.status, auth.user) ? (
            <AppRoutes app={app} />
          ) : (
            <AuthRequiredCard
              app={app}
              status={auth.status}
              user={auth.user}
              onSignIn={signIn}
            />
          )}
        </PageWrapper>
      ),
    }),
  );

  const inShellRootRoutes = rootRoutes
    .filter((r) => !r.bare)
    .map(
      ({ bare: _bare, element, ...rest }): RouteObject => ({
        ...rest,
        element: <PageWrapper>{element}</PageWrapper>,
      }),
    );

  const bareRoutes = rootRoutes
    .filter((r) => r.bare)
    .map(({ bare: _bare, ...rest }): RouteObject => rest);

  const fallback: RouteObject | null = notFoundElement
    ? { path: '*', element: <PageWrapper>{notFoundElement}</PageWrapper> }
    : fallbackPath
      ? { path: '*', element: <Navigate to={fallbackPath} replace /> }
      : null;

  return {
    routes: [
      ...bareRoutes,
      ...inShellRootRoutes,
      ...appRoutes,
      ...(fallback ? [fallback] : []),
    ],
    bareRoutes: new Set(bareRoutes),
  };
}
