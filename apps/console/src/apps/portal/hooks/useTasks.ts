import { useQuery } from '@tanstack/react-query';

import { tasksApi } from '../api/portal-client';

export interface TasksListParams {
  page?: number;
  size?: number;
  projectId?: number;
}

export function useTasksList(params: TasksListParams = {}) {
  return useQuery({
    queryKey: ['portal', 'tasks', params],
    queryFn: async () => {
      const res = await tasksApi.listTasks({
        page: params.page ?? 1,
        size: params.size ?? 50,
        projectId: params.projectId,
      });
      return res.data.data;
    },
    enabled: params.projectId === undefined || params.projectId > 0,
  });
}

const ACTIVE_STATES = new Set(['initial', 'running', 'pending', 'queued']);

export function isActiveTaskState(state: string | undefined): boolean {
  return state ? ACTIVE_STATES.has(state.toLowerCase()) : false;
}

export function useTaskDetail(
  taskId: string | undefined,
  refetchMs?: number | false
) {
  return useQuery({
    queryKey: ['portal', 'task', taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const res = await tasksApi.getTaskById({ taskId: taskId as string });
      return res.data.data;
    },
    refetchInterval: (query) => {
      if (refetchMs !== undefined) {
        return refetchMs;
      }
      const state = query.state.data?.state?.toLowerCase();
      return state && ACTIVE_STATES.has(state) ? 2_000 : false;
    },
  });
}
