import type {
  LabelCreateLabelReq,
  LabelLabelDetailResp,
  LabelLabelResp,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { labelsApi } from '../../../api/portalClient';

import { type ListResult, required, toList } from './response';

export interface ListLabelsParams {
  page?: number;
  size?: number;
}

export const labelsKeys = {
  all: ['portal', 'labels'] as const,
  list: (params: ListLabelsParams) =>
    [...labelsKeys.all, 'list', params] as const,
  detail: (id: number) => [...labelsKeys.all, 'detail', id] as const,
};

export function useLabelsList(params: ListLabelsParams) {
  return useQuery<ListResult<LabelLabelResp>>({
    queryKey: labelsKeys.list(params),
    queryFn: async () => {
      const res = await labelsApi.listLabels(params);
      return toList(res.data.data, 'labels');
    },
  });
}

export function useLabel(id: number | undefined) {
  return useQuery<LabelLabelDetailResp>({
    queryKey: labelsKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async () => {
      const res = await labelsApi.getLabelById({ labelId: id ?? -1 });
      return required(res.data.data, 'label');
    },
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: LabelCreateLabelReq): Promise<LabelLabelResp> => {
      const res = await labelsApi.createLabel({ labelCreateLabelReq: body });
      return required(res.data.data, 'label');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labelsKeys.all });
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await labelsApi.deleteLabel({ labelId: id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labelsKeys.all });
    },
  });
}
