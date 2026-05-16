import type {
  LabelCategory,
  LabelCreateLabelReq,
  LabelLabelDetailResp,
  LabelLabelResp,
  LabelUpdateLabelReq,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { labelsApi } from './portal-client';

export interface ListLabelsParams {
  page?: number;
  size?: number;
  key?: string;
  value?: string;
  category?: LabelCategory;
  isSystem?: boolean;
}

export const labelsKeys = {
  all: ['labels'] as const,
  list: (params: ListLabelsParams) => ['labels', 'list', params] as const,
  detail: (id: number) => ['labels', 'detail', id] as const,
};

export function useLabelsList(params: ListLabelsParams = {}) {
  return useQuery({
    queryKey: labelsKeys.list(params),
    queryFn: async () => {
      const res = await labelsApi.listLabels(params);
      return res.data.data ?? { items: [], pagination: undefined };
    },
  });
}

export function useLabel(labelId: number | undefined) {
  return useQuery<LabelLabelDetailResp>({
    queryKey: labelsKeys.detail(labelId ?? -1),
    enabled: labelId !== undefined && Number.isFinite(labelId),
    queryFn: async () => {
      if (labelId === undefined) {
        return {};
      }
      const res = await labelsApi.getLabelById({ labelId });
      return res.data.data ?? {};
    },
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: LabelCreateLabelReq): Promise<LabelLabelResp> => {
      const res = await labelsApi.createLabel({ labelCreateLabelReq: body });
      return res.data.data ?? {};
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labelsKeys.all });
    },
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      labelId: number;
      body: LabelUpdateLabelReq;
    }) => {
      const res = await labelsApi.updateLabel({
        labelId: args.labelId,
        labelUpdateLabelReq: args.body,
      });
      return res.data.data ?? {};
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: labelsKeys.detail(vars.labelId) });
      void qc.invalidateQueries({ queryKey: labelsKeys.all });
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labelId: number) => {
      await labelsApi.deleteLabel({ labelId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labelsKeys.all });
    },
  });
}
