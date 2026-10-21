import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import { useAppHref } from '@lincyaw/aegis-ui';

import { useActiveProjectStore } from '../hooks/useActiveProject';

interface LegacyProjectRedirectProps {
  /** Path relative to the project root, e.g. 'injections' or 'traces/:traceId'. */
  to: string;
}

/**
 * Handles the legacy `/portal/projects/:projectId/...` routes. Sets active
 * project from the URL, then redirects to the flat equivalent.
 */
export function LegacyProjectRedirect({ to }: LegacyProjectRedirectProps) {
  const params = useParams();
  const location = useLocation();
  const href = useAppHref();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const projectId = params.projectId;

  useEffect(() => {
    if (!projectId) {
      return;
    }
    const id = Number.parseInt(projectId, 10);
    if (!Number.isNaN(id)) {
      setActiveProject(id);
    }
  }, [projectId, setActiveProject]);

  let target = to;
  for (const [k, v] of Object.entries(params)) {
    if (v) {
      target = target.replace(`:${k}`, v);
    }
  }
  return <Navigate to={`${href(target)}${location.search}`} replace />;
}

export default LegacyProjectRedirect;
