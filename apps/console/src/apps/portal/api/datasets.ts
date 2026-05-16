import type {
  DatasetCreateDatasetReq,
  DatasetDatasetDetailResp,
  DatasetDatasetResp,
  DatasetUpdateDatasetReq,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { datasetsApi } from './portal-client';

export interface ListDatasetsParams {
  page?: number;
  size?: number;
  type?: string;
  isPublic?: boolean;
}

export const datasetsKeys = {
  all: ['datasets'] as const,
  list: (params: ListDatasetsParams) => ['datasets', 'list', params] as const,
  detail: (id: number) => ['datasets', 'detail', id] as const,
};

export function useDatasetsList(params: ListDatasetsParams = {}) {
  return useQuery({
    queryKey: datasetsKeys.list(params),
    queryFn: async () => {
      const res = await datasetsApi.listDatasets(params);
      return res.data.data ?? { items: [], pagination: undefined };
    },
  });
}

export function useDataset(datasetId: number | undefined) {
  return useQuery<DatasetDatasetDetailResp>({
    queryKey: datasetsKeys.detail(datasetId ?? -1),
    enabled: datasetId !== undefined && Number.isFinite(datasetId),
    queryFn: async () => {
      if (datasetId === undefined) {
        return {};
      }
      const res = await datasetsApi.getDatasetById({ datasetId });
      return res.data.data ?? {};
    },
  });
}

export function useCreateDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: DatasetCreateDatasetReq
    ): Promise<DatasetDatasetResp> => {
      const res = await datasetsApi.createDataset({
        datasetCreateDatasetReq: body,
      });
      return res.data.data ?? {};
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: datasetsKeys.all });
    },
  });
}

export function useUpdateDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      datasetId: number;
      body: DatasetUpdateDatasetReq;
    }) => {
      const res = await datasetsApi.updateDataset({
        datasetId: args.datasetId,
        datasetUpdateDatasetReq: args.body,
      });
      return res.data.data ?? {};
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: datasetsKeys.detail(vars.datasetId),
      });
      void qc.invalidateQueries({ queryKey: datasetsKeys.all });
    },
  });
}

export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datasetId: number) => {
      await datasetsApi.deleteDataset({ datasetId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: datasetsKeys.all });
    },
  });
}
