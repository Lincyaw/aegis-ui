import { useMutation, useQueryClient } from '@tanstack/react-query';

import { tasksApi } from '../../../api/portalClient';

import { executionsKeys } from './executions';
import { injectionsKeys } from './injections';
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
