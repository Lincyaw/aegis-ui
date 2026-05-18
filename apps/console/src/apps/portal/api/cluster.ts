import type { ClusterClusterStatusResp } from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { clusterApi } from './portal-client';

export const clusterKeys = {
  all: ['cluster'] as const,
  status: ['cluster', 'status'] as const,
};

export function useClusterStatus() {
  return useQuery<ClusterClusterStatusResp>({
    queryKey: clusterKeys.status,
    queryFn: async () => {
      const res = await clusterApi.getClusterStatus();
      return res.data.data ?? {};
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
