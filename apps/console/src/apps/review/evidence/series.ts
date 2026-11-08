import type {
  ChartColor,
  TimeSeriesMarker,
  TimeSeriesRow,
  TimeSeriesWindow,
} from '@lincyaw/aegis-ui';
import type {
  Context,
  MetricSeries,
  SeriesPoint,
  StatsPair,
} from '@lincyaw/review-api';

import type { ReviewStrings } from '../locale/context';

import { THRESHOLDS } from './classify';
import {
  fmtClock,
  fmtCount,
  fmtMetric,
  fmtMs,
  fmtMsBare,
  fmtPct,
} from './format';

const CALLS: ChartColor = 'cat-6';
const ERRORS: ChartColor = 'cat-3';
const LATENCY: ChartColor = 'cat-1';
const INSTANCE_COLORS: ChartColor[] = [
  'cat-1',
  'cat-3',
  'cat-4',
  'cat-2',
  'cat-5',
  'cat-6',
];

export function windowsOf(
  context: Context,
  s: ReviewStrings
): TimeSeriesWindow[] {
  return context.windows.map((w) => ({
    key: w.name,
    start: w.start,
    end: w.end,
    label: s.windowName(w.name),
    tone: w.name === 'abnormal' ? 'focus' : 'baseline',
  }));
}

export function markersOf(
  context: Context,
  s: ReviewStrings
): TimeSeriesMarker[] {
  return context.markers.map((m, i) => ({
    key: `${String(m.at)}-${String(i)}`,
    at: m.at,
    label:
      m.kind === 'injection'
        ? s.injectionAt(fmtClock(m.at, 'second'))
        : m.label,
  }));
}

/** Calls, error rate and latency of a link, bucket by bucket. */
export function linkRows(
  points: SeriesPoint[],
  stats: StatsPair | undefined,
  s: ReviewStrings
): TimeSeriesRow[] {
  const n = stats?.normal;
  const a = stats?.abnormal;
  return [
    {
      key: 'calls',
      label: s.rowCalls,
      kind: 'bars',
      lines: [
        {
          key: 'calls',
          label: s.lineCalls,
          color: CALLS,
          points: points.map((p) => ({ t: p.t, v: p.calls })),
        },
      ],
      formatValue: (v) => fmtCount(v),
      summary: n && a ? s.perWindow(fmtCount(n.calls), fmtCount(a.calls)) : '',
    },
    {
      key: 'errors',
      label: s.rowErrors,
      lines: [
        {
          key: 'errors',
          label: s.lineErrors,
          color: ERRORS,
          points: points.map((p) => ({
            t: p.t,
            v: p.calls > 0 ? p.errorRate : null,
          })),
        },
      ],
      formatValue: fmtPct,
      minMax: THRESHOLDS.errorRise,
      summary: n && a ? `${fmtPct(n.errorRate)} → ${fmtPct(a.errorRate)}` : '',
    },
    {
      key: 'latency',
      label: s.rowLatency,
      lines: [
        {
          key: 'p95',
          label: 'p95',
          color: LATENCY,
          points: points.map((p) => ({
            t: p.t,
            v: p.calls > 0 ? (p.p95Ms ?? null) : null,
          })),
        },
        {
          key: 'p50',
          label: 'p50',
          color: LATENCY,
          lineStyle: 'dashed',
          points: points.map((p) => ({
            t: p.t,
            v: p.calls > 0 ? (p.p50Ms ?? null) : null,
          })),
        },
      ],
      formatValue: fmtMs,
      summary:
        n && a
          ? `p95 ${fmtMsBare(n.p95Ms)} → ${fmtMs(a.p95Ms)} · p50 ${fmtMsBare(n.p50Ms)} → ${fmtMs(a.p50Ms)}`
          : '',
    },
  ];
}

function shortInstance(instance: string | undefined, index: number): string {
  if (instance === undefined || instance === '') {
    return `#${String(index + 1)}`;
  }
  const parts = instance.split('-');
  return parts.length > 2 ? parts.slice(-2).join('-') : instance;
}

/** One row per metric name, one line per instance. */
export function metricRows(metrics: MetricSeries[]): TimeSeriesRow[] {
  const byName = new Map<string, MetricSeries[]>();
  for (const m of metrics) {
    byName.set(m.name, [...(byName.get(m.name) ?? []), m]);
  }
  return [...byName.entries()].map(([name, list]) => {
    const unit = list[0].unit ?? undefined;
    const instances = [...new Set(list.map((m) => m.instance ?? ''))];
    return {
      key: name,
      label: name,
      lines: list.map((m) => {
        const index = instances.indexOf(m.instance ?? '');
        return {
          key: `${name}:${m.instance ?? ''}`,
          label: shortInstance(m.instance, index),
          color: INSTANCE_COLORS[index % INSTANCE_COLORS.length],
          points: m.points.map((p) => ({ t: p.t, v: p.v })),
        };
      }),
      formatValue: (v: number) => fmtMetric(v, unit ?? undefined),
    };
  });
}
