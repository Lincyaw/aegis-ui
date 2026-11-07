import { useEffect } from 'react';

import type { ProjectProjectResp } from '@lincyaw/portal';

import { useProject, useProjectsList } from '../api/projects';
import { isNotFound } from '../api/response';
import { useActiveProjectStore } from '../state/active-project';

export interface ActiveProject {
  /** `undefined` while the project resolves, when loading failed, or when there are no projects. */
  project: ProjectProjectResp | undefined;
  projectId: number | undefined;
  isLoading: boolean;
  error: unknown;
  setActiveProject: (id: number | null) => void;
}

/**
 * The project every portal page works in: the one last chosen while it
 * exists, otherwise the first project. The list holds one page of projects,
 * so a chosen project missing from it is fetched by id; only a not-found
 * answer, read against a list that is not refetching, moves the choice to
 * the first project and saves that back.
 */
export function useActiveProject(): ActiveProject {
  const projectsQuery = useProjectsList();
  const storedId = useActiveProjectStore((s) => s.activeProjectId);
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);

  const projects = projectsQuery.data?.items;
  const listed =
    storedId === null ? undefined : projects?.find((p) => p.id === storedId);
  const needsLookup =
    storedId !== null && projects !== undefined && listed === undefined;
  const lookup = useProject(needsLookup ? storedId : undefined);

  const gone = needsLookup && isNotFound(lookup.error);
  const fallback =
    (storedId === null || gone) &&
    projects !== undefined &&
    !projectsQuery.isFetching;
  const fallbackId = fallback ? (projects[0]?.id ?? null) : null;

  const project =
    listed ??
    (needsLookup ? lookup.data : undefined) ??
    (fallback ? projects[0] : undefined);

  useEffect(() => {
    if (fallback && fallbackId !== storedId) {
      setActiveProject(fallbackId);
    }
  }, [fallback, fallbackId, storedId, setActiveProject]);

  const lookupError = needsLookup && !gone ? lookup.error : null;
  const error = projectsQuery.error ?? lookupError;
  const settled = project !== undefined || (fallback && projects.length === 0);

  return {
    project,
    projectId: project?.id,
    isLoading: error === null && !settled,
    error,
    setActiveProject,
  };
}
