import type {
  PedestalInstallPedestalReq,
  PedestalInstallPedestalResult,
  PedestalPedestalHelmConfigResp,
  PedestalPedestalRelease,
  PedestalPedestalReleaseDetail,
  PedestalRestartPedestalReq,
} from '@lincyaw/portal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pedestalApi } from './portal-client';

const PEDESTAL_LONG_POLL_MS = 11 * 60 * 1000;

export const pedestalsKeys = {
  all: ['pedestals'] as const,
  list: (limit?: number) => ['pedestals', 'list', { limit }] as const,
  detail: (release: string) => ['pedestals', 'detail', release] as const,
  helmConfig: (containerVersionId: number) =>
    ['pedestals', 'helmConfig', containerVersionId] as const,
};

export function usePedestals(limit = 200) {
  return useQuery<PedestalPedestalRelease[]>({
    queryKey: pedestalsKeys.list(limit),
    queryFn: async () => {
      const res = await pedestalApi.listPedestalReleases({ limit });
      return res.data.data ?? [];
    },
  });
}

export function usePedestal(release: string | undefined) {
  return useQuery<PedestalPedestalReleaseDetail>({
    queryKey: pedestalsKeys.detail(release ?? ''),
    enabled: Boolean(release),
    queryFn: async () => {
      if (!release) {
        return {};
      }
      const res = await pedestalApi.getPedestalRelease({ release });
      return res.data.data ?? {};
    },
  });
}

export function usePedestalHelmConfig(containerVersionId: number | undefined) {
  return useQuery<PedestalPedestalHelmConfigResp>({
    queryKey: pedestalsKeys.helmConfig(containerVersionId ?? -1),
    enabled:
      containerVersionId !== undefined && Number.isFinite(containerVersionId),
    queryFn: async () => {
      if (containerVersionId === undefined) {
        return {};
      }
      const res = await pedestalApi.getPedestalHelmConfig({
        containerVersionId,
      });
      return res.data.data ?? {};
    },
  });
}

export function useInstallPedestal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: PedestalInstallPedestalReq
    ): Promise<PedestalInstallPedestalResult> => {
      const res = await pedestalApi.installPedestalRelease(
        { pedestalInstallPedestalReq: body },
        { timeout: PEDESTAL_LONG_POLL_MS }
      );
      return res.data.data ?? {};
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pedestalsKeys.all });
    },
  });
}

export function useRestartPedestal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      release: string;
      body?: PedestalRestartPedestalReq;
    }): Promise<PedestalInstallPedestalResult> => {
      const res = await pedestalApi.restartPedestalRelease(
        {
          release: args.release,
          pedestalRestartPedestalReq: args.body,
        },
        { timeout: PEDESTAL_LONG_POLL_MS }
      );
      return res.data.data ?? {};
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: pedestalsKeys.detail(vars.release),
      });
      void qc.invalidateQueries({ queryKey: pedestalsKeys.all });
    },
  });
}

export function useUninstallPedestal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { release: string; namespace?: string }) => {
      await pedestalApi.uninstallPedestalRelease(
        { release: args.release, namespace: args.namespace },
        { timeout: PEDESTAL_LONG_POLL_MS }
      );
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: pedestalsKeys.detail(vars.release),
      });
      void qc.invalidateQueries({ queryKey: pedestalsKeys.all });
    },
  });
}
