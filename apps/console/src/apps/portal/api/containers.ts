import type {
  ContainerContainerDetailResp,
  ContainerContainerResp,
  ContainerContainerVersionResp,
  ContainerCreateContainerReq,
  ContainersApiListContainersRequest,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { containersApi } from './portal-client';
import { type ListResult, required, toList } from './response';

export const containersKeys = {
  all: ['portal', 'containers'] as const,
  list: (params: ContainersApiListContainersRequest) =>
    [...containersKeys.all, 'list', params] as const,
  detail: (id: number) => [...containersKeys.all, 'detail', id] as const,
  versions: (id: number) => [...containersKeys.all, 'versions', id] as const,
};

export function useContainersList(params: ContainersApiListContainersRequest) {
  return useQuery<ListResult<ContainerContainerResp>>({
    queryKey: containersKeys.list(params),
    queryFn: async () => {
      const res = await containersApi.listContainers(params);
      return toList(res.data.data, 'containers');
    },
  });
}

export function useContainer(id: number | undefined) {
  return useQuery<ContainerContainerDetailResp>({
    queryKey: containersKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await containersApi.getContainerById({
        containerId: id ?? -1,
      });
      return required(res.data.data, 'container');
    },
  });
}

export function useContainerVersions(id: number | undefined) {
  return useQuery<ListResult<ContainerContainerVersionResp>>({
    queryKey: containersKeys.versions(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await containersApi.listContainerVersions({
        containerId: id ?? -1,
      });
      return toList(res.data.data, 'container versions');
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
      return required(res.data.data, 'container');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: containersKeys.all });
    },
  });
}
