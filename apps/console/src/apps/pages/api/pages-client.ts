import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  GenericResponsePagesPageSiteResponse,
  PagesPageSiteResponse,
} from '@lincyaw/portal';

import { gatewayUrlFor } from '../../../config/runtime';
import { pagesApi, portalAxios } from '../../portal/api/portal-client';

export type PageVisibility = 'public_listed' | 'public_unlisted' | 'private';

export interface CreatePageInput {
  files: File[];
  slug?: string;
  visibility?: PageVisibility;
  title?: string;
}

export interface UpdatePageInput {
  slug?: string;
  visibility?: PageVisibility;
  title?: string;
}

export interface ListPagesParams {
  limit?: number;
  offset?: number;
}

export const PAGES_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
  maxFiles: 200,
  slugPattern: /^[a-z0-9][a-z0-9-]{0,62}$/,
} as const;

export const pagesKeys = {
  all: ['pages'] as const,
  myList: (params: ListPagesParams) =>
    ['pages', 'my', 'list', params] as const,
  publicList: (params: ListPagesParams) =>
    ['pages', 'public', 'list', params] as const,
  detail: (id: number) => ['pages', 'detail', id] as const,
};

function fileRelPath(f: File): string {
  return f.webkitRelativePath !== '' ? f.webkitRelativePath : f.name;
}

function buildMultipart(input: CreatePageInput): FormData {
  const fd = new FormData();
  if (input.slug !== undefined && input.slug !== '') {
    fd.append('slug', input.slug);
  }
  if (input.visibility !== undefined) {
    fd.append('visibility', input.visibility);
  }
  if (input.title !== undefined && input.title !== '') {
    fd.append('title', input.title);
  }
  for (const f of input.files) {
    fd.append('files', f, fileRelPath(f));
  }
  return fd;
}

export function usePagesList(params: ListPagesParams = {}) {
  return useQuery({
    queryKey: pagesKeys.myList(params),
    queryFn: async () => {
      const res = await pagesApi.pagesListMine({
        limit: params.limit,
        offset: params.offset,
      });
      return res.data.data?.items ?? [];
    },
  });
}

export function usePagesPublic(params: ListPagesParams = {}) {
  return useQuery({
    queryKey: pagesKeys.publicList(params),
    queryFn: async () => {
      const res = await pagesApi.pagesListPublic({
        limit: params.limit,
        offset: params.offset,
      });
      return res.data.data?.items ?? [];
    },
  });
}

export function usePageDetail(id: number | undefined) {
  return useQuery({
    queryKey: pagesKeys.detail(id ?? -1),
    enabled: id !== undefined && Number.isFinite(id),
    queryFn: async (): Promise<PagesPageSiteResponse> => {
      if (id === undefined) {
        throw new Error('Missing page id');
      }
      const res = await pagesApi.pagesDetail({ id });
      const data = res.data.data;
      if (!data) {
        throw new Error('Empty page detail response');
      }
      return data;
    },
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePageInput) => {
      const res = await portalAxios.post<GenericResponsePagesPageSiteResponse>(
        gatewayUrlFor('/api/v2/pages'),
        buildMultipart(input),
      );
      const data = res.data.data;
      if (!data) {
        throw new Error('Empty create response');
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pagesKeys.all });
    },
  });
}

export function useReplacePage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePageInput) => {
      const res = await portalAxios.post<GenericResponsePagesPageSiteResponse>(
        gatewayUrlFor(`/api/v2/pages/${id.toString()}/upload`),
        buildMultipart(input),
      );
      const data = res.data.data;
      if (!data) {
        throw new Error('Empty replace response');
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pagesKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: pagesKeys.all });
    },
  });
}

export function useUpdatePage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePageInput) => {
      const res = await pagesApi.pagesUpdate({
        id,
        pagesUpdateReq: {
          slug: input.slug,
          title: input.title,
          visibility: input.visibility,
        },
      });
      const data = res.data.data;
      if (!data) {
        throw new Error('Empty update response');
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pagesKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: pagesKeys.all });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await pagesApi.pagesDelete({ id });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pagesKeys.all });
    },
  });
}

export function shareUrlForSlug(slug: string): string {
  return gatewayUrlFor(`/p/${slug}`);
}
