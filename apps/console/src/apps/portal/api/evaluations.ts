import type {
  EvaluationBatchEvaluateDatasetReq,
  EvaluationEvaluationResp,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { evaluationsApi } from './portal-client';
import { type ListResult, required, toList } from './response';

export const evaluationsKeys = {
  all: ['portal', 'evaluations'] as const,
  list: (page: number, size: number) =>
    [...evaluationsKeys.all, 'list', page, size] as const,
  detail: (id: number) => [...evaluationsKeys.all, 'detail', id] as const,
};

export function useEvaluations(page: number, size: number) {
  return useQuery<ListResult<EvaluationEvaluationResp>>({
    queryKey: evaluationsKeys.list(page, size),
    queryFn: async () => {
      const res = await evaluationsApi.listEvaluations({ page, size });
      return toList(res.data.data, 'evaluations');
    },
  });
}

export function useEvaluation(id: number | undefined) {
  return useQuery<EvaluationEvaluationResp>({
    queryKey: evaluationsKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await evaluationsApi.getEvaluationById({ id: id ?? -1 });
      return required(res.data.data, 'evaluation');
    },
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await evaluationsApi.deleteEvaluationById({ id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: evaluationsKeys.all });
    },
  });
}

export function useBatchEvaluateDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: EvaluationBatchEvaluateDatasetReq) => {
      const res = await evaluationsApi.evaluateAlgorithmOnDatasets({
        evaluationBatchEvaluateDatasetReq: body,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: evaluationsKeys.all });
    },
  });
}
