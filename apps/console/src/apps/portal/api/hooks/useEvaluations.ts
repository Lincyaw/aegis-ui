import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { apiFetch, apiJson } from '../../../../api/apiClient';

export interface EvaluationResp {
  id: number;
  project_id?: number | null;
  algorithm_name: string;
  algorithm_version: string;
  datapack_name?: string;
  dataset_name?: string;
  dataset_version?: string;
  eval_type: string;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
  result_json?: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationsListResp {
  items: EvaluationResp[];
  total: number;
  page: number;
  size: number;
}

interface GenericResponse<T> {
  code?: number;
  data?: T;
  message?: string;
}

export interface EvaluationsListParams {
  page?: number;
  size?: number;
}

const EVAL_BASE = '/api/v2/evaluations';

function unwrap<T>(r: GenericResponse<T>): T {
  if (r.data === undefined) {
    throw new Error(r.message ?? 'empty response');
  }
  return r.data;
}

export function useEvaluations(
  params: EvaluationsListParams = {},
): UseQueryResult<EvaluationsListResp> {
  const { page = 1, size = 20 } = params;
  return useQuery({
    queryKey: ['evaluations', { page, size }],
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: String(page),
        size: String(size),
      });
      const res = await apiJson<GenericResponse<EvaluationsListResp>>(
        `${EVAL_BASE}?${qs.toString()}`,
      );
      return unwrap(res);
    },
  });
}

export function useEvaluation(
  id: number | undefined,
): UseQueryResult<EvaluationResp> {
  return useQuery({
    queryKey: ['evaluation', id],
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await apiJson<GenericResponse<EvaluationResp>>(
        `${EVAL_BASE}/${String(id)}`,
      );
      return unwrap(res);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
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
      await apiFetch(`${EVAL_BASE}/${String(id)}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}

export interface BatchEvaluateDatasetSpec {
  algorithm: { name: string; version?: string; image?: string };
  dataset: { name: string; version?: string };
  filter_labels?: Array<{ key: string; value: string }>;
}

export interface BatchEvaluateDatasetReq {
  specs: BatchEvaluateDatasetSpec[];
}

export function useBatchEvaluateDataset(): UseMutationResult<
  unknown,
  Error,
  BatchEvaluateDatasetReq
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BatchEvaluateDatasetReq) => {
      const res = await apiJson<GenericResponse<unknown>>(
        `${EVAL_BASE}/datasets`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      return unwrap(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}
