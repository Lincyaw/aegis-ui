import { useMutation, useQueryClient } from '@tanstack/react-query';

import { tasksApi } from '../api/portal-client';

const ACTIVE_STATES = new Set([
  'initial',
  'running',
  'pending',
  'queued',
  'rescheduled',
]);

export function isActiveTaskState(state: string | undefined): boolean {
  return state ? ACTIVE_STATES.has(state.toLowerCase()) : false;
}

export function useCancelTask(onComplete?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await tasksApi.cancelTask({ taskId });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'trace'] });
      void qc.invalidateQueries({ queryKey: ['portal', 'injection'] });
      onComplete?.();
    },
  });
}
