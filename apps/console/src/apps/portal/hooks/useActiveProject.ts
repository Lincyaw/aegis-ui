import { useEffect } from 'react';

import type { ProjectProjectResp } from '@lincyaw/portal';

import { useProjectsList } from '../api/projects';
import { useActiveProjectStore } from '../state/active-project';

export interface ActiveProject {
  /** `undefined` while the list loads, when it failed, or when there are no projects. */
  project: ProjectProjectResp | undefined;
  projectId: number | undefined;
  isLoading: boolean;
  error: unknown;
  setActiveProject: (id: number | null) => void;
}

/**
 * The project every portal page works in: the one last chosen if it still
 * exists, otherwise the first project. The resolved choice is saved back,
 * so the header, the dashboard and every page agree on it.
 */
export function useActiveProject(): ActiveProject {
  const projectsQuery = useProjectsList();
  const storedId = useActiveProjectStore((s) => s.activeProjectId);
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);

  const projects = projectsQuery.data?.items;
  const project = projects
    ? (projects.find((p) => p.id === storedId) ?? projects[0])
    : undefined;
  const resolvedId = project?.id ?? null;

  useEffect(() => {
    if (projects !== undefined && resolvedId !== storedId) {
      setActiveProject(resolvedId);
    }
  }, [projects, resolvedId, storedId, setActiveProject]);

  return {
    project,
    projectId: project?.id,
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    setActiveProject,
  };
}
