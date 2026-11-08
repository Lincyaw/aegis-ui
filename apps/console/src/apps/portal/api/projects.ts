import type {
  DashboardDashboardResp,
  ProjectCreateProjectReq,
  ProjectProjectDetailResp,
  ProjectProjectResp,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectsApi } from '../../../api/portalClient';

import { isNotFound, type ListResult, required, toList } from './response';

export const projectsKeys = {
  all: ['portal', 'projects'] as const,
  list: () => [...projectsKeys.all, 'list'] as const,
  detail: (id: number) => [...projectsKeys.all, 'detail', id] as const,
  dashboard: (id: number) => [...projectsKeys.all, 'dashboard', id] as const,
};

export function useProjectsList() {
  return useQuery<ListResult<ProjectProjectResp>>({
    queryKey: projectsKeys.list(),
    queryFn: async () => {
      const res = await projectsApi.listProjects({ size: 100 });
      return toList(res.data.data, 'projects');
    },
  });
}

export function useProject(id: number | undefined) {
  return useQuery<ProjectProjectDetailResp>({
    queryKey: projectsKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    retry: (failures, error) => !isNotFound(error) && failures < 1,
    queryFn: async () => {
      const res = await projectsApi.getProjectById({ projectId: id ?? -1 });
      return required(res.data.data, 'project');
    },
  });
}

export function useProjectDashboard(id: number | undefined) {
  return useQuery<DashboardDashboardResp>({
    queryKey: projectsKeys.dashboard(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await projectsApi.getProjectDashboard({
        projectId: id ?? -1,
      });
      return required(res.data.data, 'dashboard');
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: ProjectCreateProjectReq
    ): Promise<ProjectProjectResp> => {
      const res = await projectsApi.createProject({
        projectCreateProjectReq: body,
      });
      return required(res.data.data, 'project');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.deleteProject({ projectId: id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}
