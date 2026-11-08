// Timeline / waterfall mechanics adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/TimelineChart/TimelineChart.tsx
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { flushSync } from 'react-dom';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Tooltip } from 'antd';

import { useDevelopAfterLoad } from '../../hooks/useDevelopAfterLoad';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { type ChartColor, chartColorValue } from '../../lib/chart';
import {
  type DurationTick,
  durationTickSteps,
  durationTicks,
  formatDuration,
} from '../../lib/format';
import { useStrings } from '../../locale';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import './TimelineChart.css';
import type { TraceSpan } from './TraceTree';

export interface TimelineChartProps {
  /**
   * The spans `TraceTree` takes. A span draws a bar when it has `startMs`
   * and `durationMs`; its depth follows `parentId`.
   */
  spans: TraceSpan[];
  /** Start of the axis in ms; defaults to the earliest span. */
  minMs?: number;
  /** End of the axis in ms; defaults to the latest span end. */
  maxMs?: number;
  /** A row's height in px; at ≤768 px a row stacks its name over its bar and takes two. */
  rowHeight?: number;
  maxVisibleRows?: number;
  /** Makes each row a button that selects its span. */
  onSelect?: (span: TraceSpan) => void;
  selectedId?: string;
  loading?: boolean;
  className?: string;
}

const NS_PER_MS = 1_000_000;

/** A timed span on the chart's nanosecond axis, with its nesting depth. */
interface TimelineRow {
  span: TraceSpan;
  startNs: number;
  durationNs: number;
  depth: number;
}

function timelineRows(spans: TraceSpan[]): TimelineRow[] {
  const parents = new Map(spans.map((span) => [span.id, span.parentId]));
  const depthOf = (span: TraceSpan): number => {
    let depth = 0;
    let parent = span.parentId;
    const seen = new Set<string>();
    while (parent && parents.has(parent) && !seen.has(parent)) {
      seen.add(parent);
      depth += 1;
      parent = parents.get(parent);
    }
    return depth;
  };
  return spans.flatMap((span) =>
    span.startMs === undefined || span.durationMs === undefined
      ? []
      : [
          {
            span,
            startNs: span.startMs * NS_PER_MS,
            durationNs: span.durationMs * NS_PER_MS,
            depth: depthOf(span),
          },
        ],
  );
}

const INDENT_PX = 12;
const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_MAX_VISIBLE_ROWS = 20;
/** However wide the track, the axis shows at most this many ticks. */
const MAX_TICK_COUNT = 6;
const STACKED_QUERY = '(max-width: 768px)';

const KIND_COLORS: ChartColor[] = [
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** A span kind keeps one data colour wherever it appears. */
function colorForKind(kind: string | undefined): string {
  if (kind === undefined || kind.length === 0) {
    return 'var(--bg-inverted)';
  }
  return chartColorValue(KIND_COLORS[hashString(kind) % KIND_COLORS.length]);
}

interface AxisTickSets {
  /** One set per round step, densest first. */
  steps: DurationTick[][];
  /**
   * 0 and one round value, the largest first, for a track too narrow for a
   * whole step.
   */
  pairs: DurationTick[][];
}

function axisTickSets(rangeMs: number): AxisTickSets {
  const steps = durationTickSteps(rangeMs, MAX_TICK_COUNT).map((step) =>
    durationTicks(rangeMs, step),
  );
  // Sparsest step first, so a value keeps its roundest label: 1 s, not 1.0 s.
  const pairs = new Map<number, DurationTick[]>();
  for (const ticks of [...steps].reverse()) {
    const end = ticks[ticks.length - 1];
    if (!pairs.has(end.ms)) {
      pairs.set(end.ms, [ticks[0], end]);
    }
  }
  return {
    steps,
    pairs: [...pairs.values()].sort((a, b) => b[1].ms - a[1].ms),
  };
}

/** The axis measured in its own font, in px. */
interface AxisMetrics {
  /** The labels measured, one per line. */
  labels: string;
  trackWidth: number;
  widths: ReadonlyMap<string, number>;
  /** How far a label sits from its tick. */
  offset: number;
  /** The least room between two labels. */
  gap: number;
}

function sameMetrics(a: AxisMetrics, b: AxisMetrics): boolean {
  return (
    a.labels === b.labels &&
    a.trackWidth === b.trackWidth &&
    a.offset === b.offset &&
    a.gap === b.gap &&
    [...b.widths].every(([label, width]) => a.widths.get(label) === width)
  );
}

/**
 * Lays out the labels of `ticks`: each sits after its tick, except the last,
 * which sits before its tick when it would run past the end. Returns which
 * labels sit before their tick, or `null` when two labels come closer than
 * the gap or one leaves the track.
 */
function placeLabels(
  ticks: DurationTick[],
  rangeMs: number,
  metrics: AxisMetrics,
): boolean[] | null {
  const { trackWidth, offset, gap } = metrics;
  const before: boolean[] = [];
  let previousRight = Number.NEGATIVE_INFINITY;
  for (const [index, tick] of ticks.entries()) {
    const x = (tick.ms / rangeMs) * trackWidth;
    const width = metrics.widths.get(tick.label) ?? trackWidth;
    let left = x + offset;
    const flips = index === ticks.length - 1 && left + width > trackWidth;
    if (flips) {
      left = x - offset - width;
    }
    if (left < 0 || left + width > trackWidth || left - previousRight < gap) {
      return null;
    }
    previousRight = left + width;
    before.push(flips);
  }
  return before;
}

function emptyDeriveBounds(): { minNs: number; maxNs: number } {
  return { minNs: 0, maxNs: 1 };
}

export function TimelineChart({
  spans,
  minMs,
  maxMs,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
  onSelect,
  selectedId,
  loading = false,
  className,
}: TimelineChartProps): ReactNode {
  const scrollRef = useRef<HTMLDivElement>(null);
  const strings = useStrings();
  const develop = useDevelopAfterLoad(loading);
  const guideTrackRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const guideLabelRef = useRef<HTMLDivElement>(null);
  const axisTicksRef = useRef<HTMLDivElement>(null);
  const tickMeasureRef = useRef<HTMLDivElement>(null);
  const [axisMetrics, setAxisMetrics] = useState<AxisMetrics | null>(null);
  const rows = useMemo(() => timelineRows(spans), [spans]);
  const stacked = useMediaQuery(STACKED_QUERY);
  const rowSize = stacked ? rowHeight * 2 : rowHeight;

  const derived = useMemo(() => {
    if (rows.length === 0) {
      return emptyDeriveBounds();
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of rows) {
      if (s.startNs < min) {
        min = s.startNs;
      }
      const end = s.startNs + s.durationNs;
      if (end > max) {
        max = end;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return { minNs: 0, maxNs: 1 };
    }
    return { minNs: min, maxNs: max };
  }, [rows]);

  const minNs = minMs === undefined ? derived.minNs : minMs * NS_PER_MS;
  const maxNs = maxMs === undefined ? derived.maxNs : maxMs * NS_PER_MS;
  const range = Math.max(maxNs - minNs, 1);

  const rangeMs = (maxNs - minNs) / NS_PER_MS;
  const tickSets = useMemo(() => axisTickSets(rangeMs), [rangeMs]);
  const tickLabels = useMemo(
    () => [...new Set(tickSets.steps.flat().map((tick) => tick.label))],
    [tickSets],
  );
  const tickLabelKey = tickLabels.join('\n');

  // Measures the track and every candidate label in the axis's own font, and
  // again whenever either resizes: the track with the layout, the labels
  // when the web font arrives.
  useIsomorphicLayoutEffect(() => {
    const track = axisTicksRef.current;
    const measurer = tickMeasureRef.current;
    if (!track || !measurer) {
      return undefined;
    }
    const measure = (): void => {
      const widths = new Map<string, number>();
      let offset = 0;
      for (const label of measurer.children) {
        widths.set(label.textContent, label.getBoundingClientRect().width);
        offset = parseFloat(getComputedStyle(label).left);
      }
      const next: AxisMetrics = {
        labels: tickLabelKey,
        trackWidth: track.getBoundingClientRect().width,
        widths,
        offset,
        gap: parseFloat(getComputedStyle(measurer).columnGap),
      };
      setAxisMetrics((current) =>
        current && sameMetrics(current, next) ? current : next,
      );
    };
    measure();
    // Re-picks before the browser paints the new width with the old ticks.
    const observer = new ResizeObserver(() => {
      flushSync(measure);
    });
    observer.observe(track);
    for (const label of measurer.children) {
      observer.observe(label);
    }
    return () => {
      observer.disconnect();
    };
  }, [tickLabelKey]);

  // The densest step whose labels fit, else 0 and the largest round value
  // that fits; until the axis is measured, or when nothing fits, 0 and the
  // largest round value, its label before its tick.
  const axis = useMemo(() => {
    if (axisMetrics?.labels === tickLabelKey && axisMetrics.trackWidth > 0) {
      for (const ticks of [...tickSets.steps, ...tickSets.pairs]) {
        const before = placeLabels(ticks, rangeMs, axisMetrics);
        if (before) {
          return { ticks, before };
        }
      }
    }
    const ticks = tickSets.pairs.length > 0 ? tickSets.pairs[0] : [];
    return {
      ticks,
      before: ticks.map((_, index) => index > 0 && index === ticks.length - 1),
    };
  }, [axisMetrics, tickLabelKey, tickSets, rangeMs]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowSize,
    overscan: 8,
  });

  // The virtualizer keeps the sizes it has laid out until told to measure.
  useIsomorphicLayoutEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowSize]);

  const bodyHeight = Math.min(rows.length, maxVisibleRows) * rowSize;

  // The guide reads the time under the pointer from the track column only;
  // over the labels it hides.
  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const track = guideTrackRef.current;
      const guide = guideRef.current;
      const label = guideLabelRef.current;
      if (!track || !guide || !label) {
        return;
      }
      const rect = track.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      if (offsetX < 0 || offsetX > rect.width) {
        guide.style.display = 'none';
        return;
      }
      const ratio = offsetX / Math.max(rect.width, 1);
      guide.style.display = 'block';
      guide.style.left = `${(ratio * 100).toFixed(4)}%`;
      label.textContent = formatDuration((ratio * range) / NS_PER_MS);
    },
    [range],
  );

  const handleMouseLeave = useCallback(() => {
    const guide = guideRef.current;
    if (guide) {
      guide.style.display = 'none';
    }
  }, []);

  const rootClassName = ['aegis-timeline-chart', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <div className="aegis-timeline-chart__axis">
        <div
          className="aegis-timeline-chart__axis-label-gutter"
          aria-hidden="true"
        />
        <div ref={axisTicksRef} className="aegis-timeline-chart__axis-ticks">
          <div
            ref={tickMeasureRef}
            className="aegis-timeline-chart__tick-measure"
            aria-hidden="true"
          >
            {tickLabels.map((label) => (
              <span key={label} className="aegis-timeline-chart__tick-label">
                {label}
              </span>
            ))}
          </div>
          {axis.ticks.map((tick, index) => (
            <div
              key={tick.label}
              className={
                axis.before[index]
                  ? 'aegis-timeline-chart__tick aegis-timeline-chart__tick--end'
                  : 'aegis-timeline-chart__tick'
              }
              style={{ left: `${((tick.ms / rangeMs) * 100).toFixed(4)}%` }}
            >
              <span className="aegis-timeline-chart__tick-label">
                {tick.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className="aegis-timeline-chart__body"
          style={{ height: `${bodyHeight || rowSize * 6}px` }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aegis-timeline-chart__skeleton-row"
              style={{ height: `${rowSize}px` }}
            >
              <div className="aegis-timeline-chart__skeleton">
                <Skeleton block height="var(--space-3)" />
              </div>
              <div className="aegis-timeline-chart__skeleton">
                <Skeleton block height="var(--space-3)" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="aegis-timeline-chart__empty">
          <EmptyState
            title={strings.timelineEmptyTitle}
            description={strings.timelineEmptyDescription}
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="aegis-timeline-chart__body"
          style={{ height: `${bodyHeight}px` }}
          data-aegis-develop={develop || undefined}
        >
          <div
            className="aegis-timeline-chart__virtual"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={guideTrackRef}
              className="aegis-timeline-chart__guide-track"
              aria-hidden="true"
            >
              <div ref={guideRef} className="aegis-timeline-chart__guide">
                <div
                  ref={guideLabelRef}
                  className="aegis-timeline-chart__guide-label"
                />
              </div>
            </div>
            {virtualizer.getVirtualItems().map((item) => {
              const { span, startNs, durationNs, depth } = rows[item.index];
              const leftPct = ((startNs - minNs) / range) * 100;
              const widthPct = (durationNs / range) * 100;
              const isSelected = selectedId === span.id;
              const classes = [
                'aegis-timeline-chart__row',
                onSelect ? 'aegis-timeline-chart__row--interactive' : '',
                isSelected ? 'aegis-timeline-chart__row--selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const barClasses = [
                'aegis-timeline-chart__bar',
                span.status === 'error'
                  ? 'aegis-timeline-chart__bar--error'
                  : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={span.id}
                  className={classes}
                  style={{
                    height: `${item.size}px`,
                    transform: `translateY(${item.start}px)`,
                  }}
                  data-id={span.id}
                  role={onSelect ? 'button' : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={
                    onSelect
                      ? () => {
                          onSelect(span);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onSelect
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect(span);
                          }
                        }
                      : undefined
                  }
                >
                  <div
                    className="aegis-timeline-chart__label"
                    style={{
                      paddingLeft: `calc(var(--space-3) + ${depth * INDENT_PX}px)`,
                    }}
                    title={span.name}
                  >
                    <span className="aegis-timeline-chart__label-text">
                      {span.name}
                    </span>
                  </div>
                  <div className="aegis-timeline-chart__track">
                    <Tooltip
                      title={`${span.name} · ${formatDuration(durationNs / NS_PER_MS)}`}
                      mouseEnterDelay={0.2}
                    >
                      <div
                        className={barClasses}
                        style={{
                          left: `${leftPct.toFixed(4)}%`,
                          width: `max(${widthPct.toFixed(4)}%, var(--size-hairline))`,
                          background:
                            span.color === undefined
                              ? colorForKind(span.kind)
                              : chartColorValue(span.color),
                        }}
                      >
                        {span.badge ? (
                          <span className="aegis-timeline-chart__bar-badge">
                            {span.badge}
                          </span>
                        ) : null}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
