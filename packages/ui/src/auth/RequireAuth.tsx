import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './useAuth';

interface RequireAuthProps {
  children: ReactNode;
  fallbackPath: string;
  loadingFallback?: ReactNode;
}

/**
 * Route guard. While the context is still resolving (e.g. an SSO
 * callback exchange), renders `loadingFallback` instead of redirecting
 * — premature navigation would yank the user out of the callback flow.
 */
export function RequireAuth({
  children,
  fallbackPath,
  loadingFallback = null,
}: RequireAuthProps): ReactNode {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return loadingFallback;
  }
  if (status === 'unauthenticated') {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }
  return children;
}
