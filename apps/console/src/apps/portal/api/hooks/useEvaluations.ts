import type {
  EvaluationBatchEvaluateDatasetReq,
  EvaluationEvaluationResp,
} from '@lincyaw/portal';
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { evaluationsApi } from '../../api/portal-client';

export type EvaluationResp = EvaluationEvaluationResp;

export interface EvaluationsListResp {
  items: EvaluationResp[];
  total: number;
  page: number;
  size: number;
}

export interface EvaluationsListParams {
  page?: number;
  size?: number;
}

export function useEvaluations(
  params: EvaluationsListParams = {}
): UseQueryResult<EvaluationsListResp> {
  const { page = 1, size = 20 } = params;
  return useQuery({
    queryKey: ['evaluations', { page, size }],
    queryFn: async () => {
      const res = await evaluationsApi.listEvaluations({ page, size });
      const d = res.data.data;
      const p = d?.pagination;
      return {
        items: d?.items ?? [],
        total: p?.total ?? 0,
        page: p?.page ?? page,
        size: p?.size ?? size,
      };
    },
  });
}

export function useEvaluation(
  id: number | undefined
): UseQueryResult<EvaluationResp> {
  return useQuery({
    queryKey: ['evaluation', id],
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await evaluationsApi.getEvaluationById({ id: id as number });
      const data = res.data.data;
      if (data === undefined) {
        throw new Error('empty response');
      }
      return data;
    },
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 5_000;
      }
      return false;
    },
  });
}

export function useDeleteEvaluation(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await evaluationsApi.deleteEvaluationById({ id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}

export type BatchEvaluateDatasetReq = EvaluationBatchEvaluateDatasetReq;

export function useBatchEvaluateDataset(): UseMutationResult<
  unknown,
  Error,
  BatchEvaluateDatasetReq
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BatchEvaluateDatasetReq) => {
      const res = await evaluationsApi.evaluateAlgorithmOnDatasets({
        evaluationBatchEvaluateDatasetReq: body,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}
