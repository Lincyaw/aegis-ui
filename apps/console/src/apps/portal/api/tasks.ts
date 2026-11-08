import { useMutation, useQueryClient } from '@tanstack/react-query';

import { executionsKeys } from './executions';
import { injectionsKeys } from './injections';
import { tasksApi } from './portal-client';
import { tracesKeys } from './traces';

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await tasksApi.cancelTask({ taskId });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tracesKeys.all });
      void qc.invalidateQueries({ queryKey: injectionsKeys.all });
      void qc.invalidateQueries({ queryKey: executionsKeys.all });
    },
  });
}
