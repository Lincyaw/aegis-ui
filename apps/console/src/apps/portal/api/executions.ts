import type {
  ExecutionExecutionDetailResp,
  ExecutionExecutionResp,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isActive } from '../domain/status';

import { ACTIVE_POLL_MS } from './polling';
import { executionsApi, projectsApi } from './portal-client';
import { type ListResult, required, toList } from './response';

export const executionsKeys = {
  all: ['portal', 'executions'] as const,
  list: (projectId: number, page: number, size: number) =>
    [...executionsKeys.all, 'list', projectId, page, size] as const,
  detail: (id: number) => [...executionsKeys.all, 'detail', id] as const,
};

export function useExecutionsList(
  projectId: number | undefined,
  page: number,
  size: number
) {
  return useQuery<ListResult<ExecutionExecutionResp>>({
    queryKey: executionsKeys.list(projectId ?? -1, page, size),
    enabled: projectId !== undefined,
    queryFn: async () => {
      const res = await projectsApi.listProjectExecutions({
        projectId: projectId ?? -1,
        page,
        size,
      });
      return toList(res.data.data, 'executions');
    },
  });
}

/** Polls while the execution is still active. */
export function useExecutionDetail(id: number | undefined) {
  return useQuery<ExecutionExecutionDetailResp>({
    queryKey: executionsKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await executionsApi.getExecutionById({ id: id ?? -1 });
      return required(res.data.data, 'execution');
    },
    refetchInterval: (query) =>
      query.state.status !== 'error' && isActive(query.state.data?.state)
        ? ACTIVE_POLL_MS
        : false,
  });
}

export interface RunAlgorithmInput {
  projectId: number;
  projectName: string;
  algorithmName: string;
  datasetName?: string;
}

export function useRunAlgorithm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RunAlgorithmInput) => {
      const res = await executionsApi.runAlgorithm({
        projectId: input.projectId,
        executionSubmitExecutionReq: {
          project_name: input.projectName,
          specs: [
            {
              algorithm: { name: input.algorithmName },
              ...(input.datasetName
                ? { dataset: { name: input.datasetName } }
                : {}),
            },
          ],
        },
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: executionsKeys.all });
    },
  });
}
