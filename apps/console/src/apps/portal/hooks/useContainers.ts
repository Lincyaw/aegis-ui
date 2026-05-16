import {
  type ContainerContainerDetailResp,
  type ContainerContainerResp,
  type ContainerCreateContainerReq,
  type ContainersApiListContainersRequest,
  ContainerType,
} from '@lincyaw/portal';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { containersApi } from '../api/portal-client';

const KEY = 'containers';

export function useContainersList(params: ContainersApiListContainersRequest = {}) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    queryFn: async (): Promise<{
      items: ContainerContainerResp[];
      total: number;
    }> => {
      const res = await containersApi.listContainers(params);
      const data = res.data.data;
      return {
        items: data?.items ?? [],
        total: data?.pagination?.total ?? 0,
      };
    },
  });
}

export function useContainer(containerId: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', containerId],
    enabled: containerId !== undefined && !Number.isNaN(containerId),
    queryFn: async (): Promise<ContainerContainerDetailResp> => {
      const res = await containersApi.getContainerById({
        containerId: containerId as number,
      });
      return res.data.data ?? {};
    },
  });
}

export function useCreateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: ContainerCreateContainerReq) => {
      const res = await containersApi.createContainer({
        containerCreateContainerReq: req,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export const containerTypeLabel: Record<ContainerType, string> = {
  [ContainerType.Algorithm]: 'Algorithm',
  [ContainerType.Benchmark]: 'Benchmark',
  [ContainerType.Pedestal]: 'Pedestal',
};
