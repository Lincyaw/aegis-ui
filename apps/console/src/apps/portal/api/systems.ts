import type {
  ChaossystemChaosSystemResp,
  ChaossystemInjectCandidateResp,
} from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { type ListResult, toList, wholeList } from './list';
import { systemsApi } from './portal-client';

export const systemsKeys = {
  all: ['portal', 'systems'] as const,
  list: () => [...systemsKeys.all, 'list'] as const,
  candidates: (name: string, namespace: string | undefined) =>
    [...systemsKeys.all, 'candidates', name, namespace ?? null] as const,
};

export function useSystems() {
  return useQuery<ListResult<ChaossystemChaosSystemResp>>({
    queryKey: systemsKeys.list(),
    queryFn: async () => {
      const res = await systemsApi.listChaosSystems({});
      return toList(res.data.data);
    },
  });
}

/** Apps the system can inject into, in one namespace or across all of them. */
export function useInjectCandidates(name: string, namespace?: string) {
  const ns = namespace && namespace.length > 0 ? namespace : undefined;
  return useQuery<ListResult<ChaossystemInjectCandidateResp>>({
    queryKey: systemsKeys.candidates(name, ns),
    enabled: name.length > 0,
    queryFn: async () => {
      const res = await systemsApi.listSystemInjectCandidates({
        name,
        namespace: ns,
      });
      return wholeList(res.data.data?.candidates);
    },
  });
}
