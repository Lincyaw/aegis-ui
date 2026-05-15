import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import { useMockStore } from '../mocks';

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
  const setActiveProject = useMockStore((s) => s.setActiveProject);
  const projectId = params.projectId;

  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);

  let target = to;
  for (const [k, v] of Object.entries(params)) {
    if (v) {
      target = target.replace(`:${k}`, v);
    }
  }
  const search = location.search ?? '';
  return <Navigate to={`${target}${search}`} replace />;
}

export default LegacyProjectRedirect;
