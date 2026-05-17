import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { executionsApi, projectsApi } from '../api/portal-client';

export interface ExecutionsPage {
  page?: number;
  size?: number;
}

export function useExecutionsList(
  projectId: number,
  page: ExecutionsPage = {}
) {
  return useQuery({
    queryKey: [
      'portal',
      'executions',
      projectId,
      page.page ?? 1,
      page.size ?? 30,
    ],
    queryFn: async () => {
      const res = await projectsApi.listProjectExecutions({
        projectId,
        page: page.page ?? 1,
        size: page.size ?? 30,
      });
      return res.data.data;
    },
    enabled: projectId > 0,
  });
}

export function useExecutionDetail(executionId: number | undefined) {
  return useQuery({
    queryKey: ['portal', 'execution', executionId],
    enabled: executionId !== undefined && Number.isFinite(executionId),
    queryFn: async () => {
      const res = await executionsApi.getExecutionById({
        id: executionId as number,
      });
      return res.data.data;
    },
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'Initial' ? 3_000 : false;
    },
  });
}

export interface RunAlgorithmInput {
  projectId: number;
  projectName: string;
  algorithmName: string;
  algorithmVersion?: string;
  datasetName?: string;
  datasetVersion?: string;
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
              algorithm: {
                name: input.algorithmName,
                version: input.algorithmVersion,
              },
              ...(input.datasetName
                ? {
                    dataset: {
                      name: input.datasetName,
                      version: input.datasetVersion,
                    },
                  }
                : {}),
            },
          ],
        },
      });
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ['portal', 'executions', vars.projectId],
      });
    },
  });
}
