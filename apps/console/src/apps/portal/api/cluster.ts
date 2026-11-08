import type { ClusterClusterStatusResp } from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { clusterApi } from '../../../api/portalClient';

import { unlessFailed } from './polling';
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
