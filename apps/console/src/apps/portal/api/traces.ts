import type {
  TraceSpansResp,
  TraceTraceDetailResp,
  TraceTraceLogsResp,
} from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { tracesApi } from '../../../api/portalClient';
import { isActive } from '../domain/status';

import { pollMs, type RefreshInterval, unlessFailed } from './polling';
import { required } from './response';

export interface TraceLogsOptions {
  limit?: number;
  level?: string;
  q?: string;
  start?: string;
  end?: string;
  cursor?: string;
}

export const tracesKeys = {
  all: ['portal', 'traces'] as const,
  detail: (traceId: string) => [...tracesKeys.all, 'detail', traceId] as const,
  spans: (traceId: string) => [...tracesKeys.all, 'spans', traceId] as const,
  logs: (traceId: string, opts: TraceLogsOptions) =>
    [...tracesKeys.all, 'logs', traceId, opts] as const,
};

/** The orchestrator trace; `auto` polls while its state is active. */
export function useProcessTrace(
  traceId: string | undefined,
  refresh: RefreshInterval
) {
  return useQuery<TraceTraceDetailResp>({
    queryKey: tracesKeys.detail(traceId ?? ''),
    enabled: Boolean(traceId),
    queryFn: async () => {
      const res = await tracesApi.getTraceById({ traceId: traceId ?? '' });
      return required(res.data.data, 'trace');
    },
    refetchInterval: (query) =>
      query.state.status === 'error'
        ? false
        : pollMs(refresh, isActive(query.state.data?.state)),
  });
}

export function useTraceSpans(
  traceId: string | undefined,
  refetchMs: number | false
) {
  return useQuery<TraceSpansResp>({
    queryKey: tracesKeys.spans(traceId ?? ''),
    enabled: Boolean(traceId),
    queryFn: async () => {
      const res = await tracesApi.getTraceSpans({ traceId: traceId ?? '' });
      return required(res.data.data, 'spans');
    },
    refetchInterval: unlessFailed(refetchMs),
  });
}

export function useTraceLogs(
  traceId: string | undefined,
  opts: TraceLogsOptions,
  refetchMs: number | false
) {
  const { limit = 200, level, q, start, end, cursor } = opts;
  return useQuery<TraceTraceLogsResp>({
    queryKey: tracesKeys.logs(traceId ?? '', {
      limit,
      level,
      q,
      start,
      end,
      cursor,
    }),
    enabled: Boolean(traceId),
    queryFn: async () => {
      const res = await tracesApi.getTraceLogs({
        traceId: traceId ?? '',
        start,
        end,
        q,
        level,
        limit,
        cursor,
      });
      return required(res.data.data, 'logs');
    },
    refetchInterval: unlessFailed(refetchMs),
  });
}
