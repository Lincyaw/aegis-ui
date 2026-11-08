import { useCallback, useState } from 'react';

import type { Verdict } from '@lincyaw/review-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reviewKeys } from '../queries';
import { repoKey, useReview } from '../review';

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving'; itemId: string }
  | { status: 'saved'; itemId: string; at: number }
  | { status: 'error'; itemId: string; message: string };

interface SaveArgs {
  itemId: string;
  value: string;
  note: string;
}

/** Saves a verdict, showing it at once and rolling back if the save fails. */
export function useVerdictSaver(
  taskId: string,
  reviewer: string
): { save: (args: SaveArgs) => void; state: SaveState } {
  const { repo } = useReview();
  const queryClient = useQueryClient();
  const key = reviewKeys.verdicts(repoKey(repo), taskId, reviewer);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const put = (list: Verdict[] | undefined, verdict: Verdict): Verdict[] => [
    ...(list ?? []).filter((v) => v.itemId !== verdict.itemId),
    verdict,
  ];

  const mutation = useMutation({
    mutationFn: (args: SaveArgs) =>
      repo.putVerdict(taskId, reviewer, args.itemId, {
        value: args.value,
        note: args.note,
      }),
    onMutate: async (args) => {
      setState({ status: 'saving', itemId: args.itemId });
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<Verdict[]>(key);
      queryClient.setQueryData<Verdict[]>(key, (list) =>
        put(list, {
          itemId: args.itemId,
          reviewer,
          value: args.value,
          note: args.note,
          updatedAt: Math.floor(Date.now() / 1000),
        })
      );
      return { before };
    },
    onSuccess: (verdict) => {
      queryClient.setQueryData<Verdict[]>(key, (list) => put(list, verdict));
      setState({
        status: 'saved',
        itemId: verdict.itemId,
        at: verdict.updatedAt,
      });
    },
    onError: (error, args, context) => {
      queryClient.setQueryData(key, context?.before);
      setState({
        status: 'error',
        itemId: args.itemId,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  });

  const { mutate } = mutation;
  const save = useCallback(
    (args: SaveArgs) => {
      mutate(args);
    },
    [mutate]
  );
  return { save, state };
}
