import {
  type InjectionGuidedSpec,
  type InjectionInjectionDetailResp,
  type InjectionInjectionResp,
  type InjectionSubmitInjectionReq,
  type TraceTraceDetailResp,
} from '@lincyaw/portal';
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { GuidedInjectionSpec } from '../mocks/types';

import { injectionsApi, projectsApi, tracesApi } from './portal-client';

const TRACE_ACTIVE_STATES = new Set([
  'initial',
  'pending',
  'queued',
  'running',
  'restarting',
  'installing',
  'rescheduled',
]);

const STATUS_ACTIVE = new Set([
  'pending',
  'running',
  'restarting',
  'installing',
]);

export function isActiveStatus(status: string | undefined): boolean {
  return status ? STATUS_ACTIVE.has(status.toLowerCase()) : false;
}

export function toGuidedSpec(spec: GuidedInjectionSpec): InjectionGuidedSpec {
  return {
    app: spec.app || undefined,
    body_type: spec.bodyType,
    buffer: spec.buffer,
    chaos_type: spec.chaosType || undefined,
    class: spec.class,
    container: spec.container || undefined,
    correlation: spec.correlation,
    corrupt: spec.corrupt,
    cpu_count: spec.cpuCount,
    cpu_load: spec.cpuLoad,
    cpu_worker: spec.cpuWorker,
    database: spec.database,
    delay_duration: spec.latencyDuration,
    direction: spec.direction,
    domain: spec.domain,
    duplicate: spec.duplicate,
    duration: spec.durationSec,
    exception_opt: spec.exceptionOpt,
    http_method: spec.httpMethod,
    jitter: spec.jitter,
    latency_ms: spec.latencyMs,
    latency_duration: spec.latencyDuration,
    limit: spec.limit,
    loss: spec.loss,
    mem_type: spec.memType,
    mem_worker: spec.memWorker,
    memory_size: spec.memSize,
    method: spec.method,
    mutator_config: spec.mutatorConfig,
    namespace: spec.namespace || undefined,
    operation: spec.operation,
    rate: spec.rate,
    replace_method: spec.replaceMethod,
    return_type: spec.returnType,
    return_value_opt: spec.returnOpt,
    route: spec.route,
    status_code: spec.returnCode,
    system: spec.systemCode || undefined,
    system_type: spec.systemType || undefined,
    table: spec.table,
    target_service: spec.targetService || undefined,
    time_offset: spec.timeOffset,
  };
}

export function injectionsKey(
  projectId: number,
  page = 1,
  size = 50
): readonly unknown[] {
  return ['portal', 'injections', projectId, page, size] as const;
}

export function injectionKey(id: number): readonly unknown[] {
  return ['portal', 'injection', id] as const;
}

export function useInjectionsList(
  projectId: number,
  opts?: { page?: number; size?: number }
): UseQueryResult<InjectionInjectionResp[]> {
  const page = opts?.page ?? 1;
  const size = opts?.size ?? 50;
  return useQuery({
    queryKey: injectionsKey(projectId, page, size),
    queryFn: async () => {
      const resp = await projectsApi.listProjectInjections({
        projectId,
        page,
        size,
      });
      return resp.data.data?.items ?? [];
    },
    enabled: projectId > 0,
  });
}

export function useInjectionDetail(
  id: number | null
): UseQueryResult<InjectionInjectionDetailResp | undefined> {
  return useQuery({
    queryKey: id != null ? injectionKey(id) : ['portal', 'injection', 'null'],
    queryFn: async () => {
      if (id == null) return undefined;
      const resp = await injectionsApi.getInjectionById({ id });
      return resp.data.data;
    },
    enabled: id != null && id > 0,
    refetchInterval: (query) => {
      const detail = query.state.data as
        | InjectionInjectionDetailResp
        | undefined;
      return isActiveStatus(detail?.status) ? 3_000 : false;
    },
  });
}

export function isActiveTraceState(state: string | undefined): boolean {
  return state ? TRACE_ACTIVE_STATES.has(state.toLowerCase()) : false;
}

export function useProcessTrace(
  traceId: string | null | undefined,
  /**
   * Polling override. `undefined` keeps the default (3s while active, off
   * after terminal). `false` disables polling entirely. A number forces that
   * interval (ms) regardless of state.
   */
  refetchMs?: number | false
): UseQueryResult<TraceTraceDetailResp | undefined> {
  return useQuery({
    queryKey: ['portal', 'trace', traceId ?? null],
    queryFn: async () => {
      if (!traceId) {
        return undefined;
      }
      const resp = await tracesApi.getTraceById({ traceId });
      return resp.data.data;
    },
    enabled: Boolean(traceId),
    refetchInterval: (query) => {
      if (refetchMs !== undefined) {
        return refetchMs;
      }
      const detail = query.state.data as TraceTraceDetailResp | undefined;
      return isActiveTraceState(detail?.state) ? 3_000 : false;
    },
  });
}

export interface SubmitInjectionInput {
  projectId: number;
  specs: GuidedInjectionSpec[];
  autoAllocate?: boolean;
  allowBootstrap?: boolean;
  skipRestartPedestal?: boolean;
}

export function useSubmitInjection(): UseMutationResult<
  unknown,
  Error,
  SubmitInjectionInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const req: InjectionSubmitInjectionReq = {
        benchmark: { name: '' },
        pedestal: { name: '' },
        specs: [input.specs.map(toGuidedSpec)],
        auto_allocate: input.autoAllocate,
        allow_bootstrap: input.allowBootstrap,
        skip_restart_pedestal: input.skipRestartPedestal,
      };
      const resp = await projectsApi.submitProjectFaultInjection({
        projectId: input.projectId,
        injectionSubmitInjectionReq: req,
      });
      return resp.data.data;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: ['portal', 'injections', vars.projectId],
      });
    },
  });
}
