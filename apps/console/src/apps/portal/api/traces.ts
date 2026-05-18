import type { TraceTraceLogsResp } from '@lincyaw/portal';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { tracesApi } from './portal-client';

export interface TraceLogsOptions {
  limit?: number;
  level?: string;
  q?: string;
  start?: string;
  end?: string;
  cursor?: string;
}

export function useTraceLogs(
  traceId: string | null | undefined,
  opts?: TraceLogsOptions,
  refetchMs?: number | false
): UseQueryResult<TraceTraceLogsResp | undefined> {
  const { limit = 200, level, q, start, end, cursor } = opts ?? {};
  return useQuery({
    queryKey: [
      'portal',
      'trace-logs',
      traceId ?? null,
      limit,
      level ?? null,
      q ?? null,
      start ?? null,
      end ?? null,
      cursor ?? null,
    ],
    queryFn: async () => {
      if (!traceId) {
        return undefined;
      }
      const resp = await tracesApi.getTraceLogs({
        traceId,
        start,
        end,
        q,
        level,
        limit,
        cursor,
      });
      return resp.data.data;
    },
    enabled: typeof traceId === 'string' && traceId.length > 0,
    refetchInterval: refetchMs ?? false,
  });
}
