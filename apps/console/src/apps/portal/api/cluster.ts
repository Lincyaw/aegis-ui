import type { ClusterClusterStatusResp } from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { unlessFailed } from './polling';
import { clusterApi } from './portal-client';
import { required } from './response';

export const clusterKeys = {
  all: ['portal', 'cluster'] as const,
  status: () => [...clusterKeys.all, 'status'] as const,
};

export function useClusterStatus() {
  return useQuery<ClusterClusterStatusResp>({
    queryKey: clusterKeys.status(),
    queryFn: async () => {
      const res = await clusterApi.getClusterStatus();
      return required(res.data.data, 'cluster status');
    },
    refetchInterval: unlessFailed(5000),
    refetchIntervalInBackground: false,
  });
}
