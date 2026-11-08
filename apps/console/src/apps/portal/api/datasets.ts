import type {
  DatasetCreateDatasetReq,
  DatasetDatasetDetailResp,
  DatasetDatasetResp,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { datasetsApi } from '../../../api/portalClient';

import { type ListResult, required, toList } from './response';

export interface ListDatasetsParams {
  page?: number;
  size?: number;
}

export const datasetsKeys = {
  all: ['portal', 'datasets'] as const,
  list: (params: ListDatasetsParams) =>
    [...datasetsKeys.all, 'list', params] as const,
  detail: (id: number) => [...datasetsKeys.all, 'detail', id] as const,
};

export function useDatasetsList(params: ListDatasetsParams) {
  return useQuery<ListResult<DatasetDatasetResp>>({
    queryKey: datasetsKeys.list(params),
    queryFn: async () => {
      const res = await datasetsApi.listDatasets(params);
      return toList(res.data.data, 'datasets');
    },
  });
}

export function useDataset(id: number | undefined) {
  return useQuery<DatasetDatasetDetailResp>({
    queryKey: datasetsKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await datasetsApi.getDatasetById({ datasetId: id ?? -1 });
      return required(res.data.data, 'dataset');
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
      return required(res.data.data, 'dataset');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: datasetsKeys.all });
    },
  });
}

export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await datasetsApi.deleteDataset({ datasetId: id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: datasetsKeys.all });
    },
  });
}
