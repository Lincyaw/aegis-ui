import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { projectsApi } from '../api/portal-client';
import type {
  ProjectCreateProjectReq,
  ProjectProjectDetailResp,
  ProjectProjectResp,
  ProjectUpdateProjectReq,
} from '@lincyaw/portal';

export const projectKeys = {
  all: ['portal', 'projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: number) => [...projectKeys.all, 'detail', id] as const,
};

export function useProjectsList(): UseQueryResult<ProjectProjectResp[]> {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const res = await projectsApi.listProjects({ size: 200 });
      return res.data.data?.items ?? [];
    },
  });
}

export function useProject(
  id: number | undefined,
): UseQueryResult<ProjectProjectDetailResp> {
  return useQuery({
    queryKey: id === undefined ? ['portal', 'projects', 'detail', 'none'] : projectKeys.detail(id),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await projectsApi.getProjectById({ projectId: id as number });
      const data = res.data.data;
      if (!data) {
        throw new Error('Project not found');
      }
      return data;
    },
  });
}

export function useCreateProject(): UseMutationResult<
  ProjectProjectResp,
  Error,
  ProjectCreateProjectReq
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProjectCreateProjectReq) => {
      const res = await projectsApi.createProject({ projectCreateProjectReq: body });
      const created = res.data.data;
      if (!created) {
        throw new Error('Create project returned no data');
      }
      return created;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(): UseMutationResult<
  ProjectProjectResp,
  Error,
  { id: number; body: ProjectUpdateProjectReq }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const res = await projectsApi.updateProject({
        projectId: id,
        projectUpdateProjectReq: body,
      });
      const updated = res.data.data;
      if (!updated) {
        throw new Error('Update project returned no data');
      }
      return updated;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

export function useDeleteProject(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.deleteProject({ projectId: id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
