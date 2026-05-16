import { parseTimeRangeInput } from '@lincyaw/aegis-ui';
import type {
  ObservationListSpansResp,
  ObservationMetricsCatalogResp,
  ObservationMetricsSeriesResp,
  ObservationServiceMapResp,
  ObservationSpanTreeResp,
} from '@lincyaw/portal';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { observationApi } from '../api/portal-client';

export interface ResolvedTimeRange {
  start?: string;
  end?: string;
}

export function resolveTimeRange(value: string): ResolvedTimeRange {
  if (value.trim().length === 0) {
    return {};
  }
  const parsed = parseTimeRangeInput(value, new Date());
  if (!parsed) {
    return {};
  }
  return {
    start: parsed.from.toISOString(),
    end: parsed.to.toISOString(),
  };
}

export function useMetricsCatalog(
  injectionId: number | null
): UseQueryResult<ObservationMetricsCatalogResp> {
  return useQuery({
    queryKey: ['obs', 'metrics-catalog', injectionId],
    enabled: injectionId !== null,
    queryFn: async () => {
      const res = await observationApi.getObservationMetricsCatalog({
        id: injectionId as number,
      });
      return res.data.data ?? {};
    },
  });
}

export interface UseMetricsSeriesParams {
  injectionId: number | null;
  metric: string | null;
  range: string;
  step?: string;
  groupBy?: string;
  filter?: string;
}

export function useMetricsSeries(
  params: UseMetricsSeriesParams
): UseQueryResult<ObservationMetricsSeriesResp> {
  const { injectionId, metric, range, step, groupBy, filter } = params;
  const { start, end } = resolveTimeRange(range);
  return useQuery({
    queryKey: [
      'obs',
      'metrics-series',
      injectionId,
      metric,
      start,
      end,
      step,
      groupBy,
      filter,
    ],
    enabled: injectionId !== null && metric !== null && metric.length > 0,
    queryFn: async () => {
      const res = await observationApi.getObservationMetricsSeries({
        id: injectionId as number,
        metric: metric as string,
        start,
        end,
        step,
        groupBy,
        filter,
      });
      return res.data.data ?? {};
    },
  });
}

export function useServiceMap(
  injectionId: number | null,
  window?: string
): UseQueryResult<ObservationServiceMapResp> {
  return useQuery({
    queryKey: ['obs', 'service-map', injectionId, window],
    enabled: injectionId !== null,
    queryFn: async () => {
      const res = await observationApi.getObservationServiceMap({
        id: injectionId as number,
        window,
      });
      return res.data.data ?? {};
    },
  });
}

export interface UseSpansListParams {
  injectionId: number | null;
  range: string;
  service?: string;
  op?: string;
  minDuration?: number;
  status?: string;
  limit?: number;
  cursor?: string;
}

export function useSpansList(
  params: UseSpansListParams
): UseQueryResult<ObservationListSpansResp> {
  const {
    injectionId,
    range,
    service,
    op,
    minDuration,
    status,
    limit,
    cursor,
  } = params;
  const { start, end } = resolveTimeRange(range);
  return useQuery({
    queryKey: [
      'obs',
      'spans',
      injectionId,
      service,
      op,
      minDuration,
      start,
      end,
      status,
      limit,
      cursor,
    ],
    enabled: injectionId !== null,
    queryFn: async () => {
      const res = await observationApi.listObservationSpans({
        id: injectionId as number,
        service,
        op,
        minDuration,
        start,
        end,
        status,
        limit,
        cursor,
      });
      return res.data.data ?? {};
    },
  });
}

export function useSpanTree(
  injectionId: number | null,
  traceId: string | null
): UseQueryResult<ObservationSpanTreeResp> {
  return useQuery({
    queryKey: ['obs', 'span-tree', injectionId, traceId],
    enabled: injectionId !== null && traceId !== null && traceId.length > 0,
    queryFn: async () => {
      const res = await observationApi.getObservationSpanTree({
        id: injectionId as number,
        traceId: traceId as string,
      });
      return res.data.data ?? {};
    },
  });
}
