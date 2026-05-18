import type {
  ChaossystemChaosSystemResp,
  ChaossystemInjectCandidateResp,
} from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { systemsApi } from './portal-client';

export const systemsKeys = {
  all: ['systems'] as const,
  list: (page?: number, size?: number) =>
    ['systems', 'list', { page, size }] as const,
  candidates: (name: string, namespace: string) =>
    ['systems', 'candidates', name, namespace] as const,
};

export function useSystems(params: { page?: number; size?: number } = {}) {
  return useQuery<ChaossystemChaosSystemResp[]>({
    queryKey: systemsKeys.list(params.page, params.size),
    queryFn: async () => {
      const res = await systemsApi.listChaosSystems(params);
      return res.data.data?.items ?? [];
    },
  });
}

export function useInjectCandidates(name: string, namespace: string) {
  return useQuery<ChaossystemInjectCandidateResp[]>({
    queryKey: systemsKeys.candidates(name, namespace),
    enabled: name.length > 0 && namespace.length > 0,
    queryFn: async () => {
      const res = await systemsApi.listSystemInjectCandidates({
        name,
        namespace,
      });
      return res.data.data?.candidates ?? [];
    },
  });
}
