import type {
  InjectionInjectionDetailResp,
  InjectionInjectionResp,
  InjectionInjectionTimelineResp,
  InjectionSubmitInjectionReq,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isActive } from '../domain/status';

import { type ListResult, required, toList } from './list';
import { ACTIVE_POLL_MS, unlessFailed } from './polling';
import { injectionsApi, projectsApi } from './portal-client';

export const injectionsKeys = {
  all: ['portal', 'injections'] as const,
  list: (projectId: number, page: number, size: number) =>
    [...injectionsKeys.all, 'list', projectId, page, size] as const,
  detail: (id: number) => [...injectionsKeys.all, 'detail', id] as const,
  timeline: (id: number) => [...injectionsKeys.all, 'timeline', id] as const,
};

export function useInjectionsList(
  projectId: number | undefined,
  page: number,
  size: number
) {
  return useQuery<ListResult<InjectionInjectionResp>>({
    queryKey: injectionsKeys.list(projectId ?? -1, page, size),
    enabled: projectId !== undefined,
    queryFn: async () => {
      const res = await projectsApi.listProjectInjections({
        projectId: projectId ?? -1,
        page,
        size,
      });
      return toList(res.data.data);
    },
  });
}

/** Polls while the injection is still active. */
export function useInjectionDetail(id: number | undefined) {
  return useQuery<InjectionInjectionDetailResp>({
    queryKey: injectionsKeys.detail(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await injectionsApi.getInjectionById({ id: id ?? -1 });
      return required(res.data.data, 'injection');
    },
    refetchInterval: (query) => {
      const detail = query.state.data;
      return query.state.status !== 'error' &&
        isActive(detail?.status ?? detail?.state)
        ? ACTIVE_POLL_MS
        : false;
    },
  });
}

export function useInjectionTimeline(
  id: number | undefined,
  refetchMs: number | false
) {
  return useQuery<InjectionInjectionTimelineResp>({
    queryKey: injectionsKeys.timeline(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await injectionsApi.getInjectionTimeline({ id: id ?? -1 });
      return required(res.data.data, 'timeline');
    },
    refetchInterval: unlessFailed(refetchMs),
  });
}

export function useSubmitInjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: number;
      request: InjectionSubmitInjectionReq;
    }) => {
      const res = await projectsApi.submitProjectFaultInjection({
        projectId: input.projectId,
        injectionSubmitInjectionReq: input.request,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: injectionsKeys.all });
    },
  });
}

export function useCancelInjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await injectionsApi.cancelInjection({ id });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: injectionsKeys.all });
    },
  });
}

export function useDeleteInjections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await injectionsApi.batchDeleteInjections({
        injectionBatchDeleteInjectionReq: { ids },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: injectionsKeys.all });
    },
  });
}
