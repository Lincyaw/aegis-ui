import { PageSize } from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { containersApi, datasetsApi } from '../api/portal-client';

export function useContainersList() {
  return useQuery({
    queryKey: ['portal', 'containers'],
    queryFn: async () => {
      const res = await containersApi.listContainers({
        page: 1,
        size: PageSize.XLarge,
      });
      return res.data.data?.items ?? [];
    },
  });
}

export function useDatasetsList() {
  return useQuery({
    queryKey: ['portal', 'datasets'],
    queryFn: async () => {
      const res = await datasetsApi.listDatasets({ page: 1, size: 100 });
      return res.data.data?.items ?? [];
    },
  });
}
