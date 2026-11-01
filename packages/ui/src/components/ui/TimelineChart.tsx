// Timeline / waterfall mechanics adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/TimelineChart/TimelineChart.tsx
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Tooltip } from 'antd';

import { type ChartColor, chartColorValue, niceTicks } from '../../lib/chart';
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
  rowHeight?: number;
  maxVisibleRows?: number;
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
const APPROX_TICK_COUNT = 6;

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

interface DurationUnit {
  label: string;
  perNs: number;
}

const DURATION_UNITS: DurationUnit[] = [
  { label: 'ns', perNs: 1 },
  { label: 'μs', perNs: 1_000 },
  { label: 'ms', perNs: 1_000_000 },
  { label: 's', perNs: 1_000_000_000 },
  { label: 'm', perNs: 60 * 1_000_000_000 },
];

function pickUnit(spanNs: number): DurationUnit {
  let best: DurationUnit = DURATION_UNITS[0];
  for (const unit of DURATION_UNITS) {
    if (spanNs / unit.perNs >= 1) {
      best = unit;
    }
  }
  return best;
}

function formatThousands(value: number, fractionDigits: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDuration(ns: number): string {
  const unit = pickUnit(Math.max(ns, 1));
  const value = ns / unit.perNs;
  const fractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${formatThousands(value, fractionDigits)} ${unit.label}`;
}

interface TickSpec {
  ns: number;
  label: string;
}

/** Ticks at round offsets from the start: 0, 1 ms, 2 ms, … */
function buildTicks(minNs: number, maxNs: number): TickSpec[] {
  const range = maxNs - minNs;
  const unit = pickUnit(range);
  return niceTicks(0, range, APPROX_TICK_COUNT).map((offset) => {
    const value = offset / unit.perNs;
    const fractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return {
      ns: minNs + offset,
      label: `${formatThousands(value, fractionDigits)} ${unit.label}`,
    };
  });
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
  const trackHeaderRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const guideLabelRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => timelineRows(spans), [spans]);
  const [hasSpans, setHasSpans] = useState(rows.length > 0);

  if (hasSpans !== rows.length > 0) {
    setHasSpans(rows.length > 0);
  }

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

  const ticks = useMemo(() => buildTicks(minNs, maxNs), [minNs, maxNs]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const bodyHeight = Math.min(rows.length, maxVisibleRows) * rowHeight;

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const track = event.currentTarget;
      const rect = track.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      if (offsetX < 0 || offsetX > rect.width) {
        return;
      }
      const ratio = offsetX / Math.max(rect.width, 1);
      const guide = guideRef.current;
      const label = guideLabelRef.current;
      if (guide) {
        guide.style.display = 'block';
        guide.style.left = `${offsetX.toFixed(2)}px`;
      }
      if (label) {
        label.textContent = formatDuration(ratio * range);
      }
    },
    [range],
  );

  const handleMouseLeave = useCallback(() => {
    const guide = guideRef.current;
    if (guide) {
      guide.style.display = 'none';
    }
  }, []);

  const handleRowActivate = useCallback(
    (span: TraceSpan) => {
      onSelect?.(span);
    },
    [onSelect],
  );

  const handleRowKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, span: TraceSpan) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRowActivate(span);
      }
    },
    [handleRowActivate],
  );

  const gridTemplate = 'var(--timeline-chart-label-width) 1fr';

  const rootClassName = ['aegis-timeline-chart', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <div
        className="aegis-timeline-chart__axis"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div
          className="aegis-timeline-chart__axis-label-gutter"
          aria-hidden="true"
        />
        <div className="aegis-timeline-chart__axis-ticks" ref={trackHeaderRef}>
          {ticks.map((tick) => {
            const left = ((tick.ns - minNs) / range) * 100;
            return (
              <div
                key={tick.ns}
                className="aegis-timeline-chart__tick"
                style={{ left: `${left.toFixed(4)}%` }}
              >
                <span className="aegis-timeline-chart__tick-label">
                  {tick.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          className="aegis-timeline-chart__body"
          style={{ height: `${bodyHeight || rowHeight * 6}px` }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aegis-timeline-chart__skeleton-row"
              style={{
                gridTemplateColumns: gridTemplate,
                height: `${rowHeight}px`,
              }}
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
      ) : !hasSpans ? (
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
        >
          <div
            className="aegis-timeline-chart__virtual"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={guideRef}
              className="aegis-timeline-chart__guide"
              aria-hidden="true"
            >
              <div
                ref={guideLabelRef}
                className="aegis-timeline-chart__guide-label"
              />
            </div>
            {virtualizer.getVirtualItems().map((item) => {
              const { span, startNs, durationNs, depth } = rows[item.index];
              const leftPct = ((startNs - minNs) / range) * 100;
              const widthPct = (durationNs / range) * 100;
              const isSelected = selectedId === span.id;
              const classes = [
                'aegis-timeline-chart__row',
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
                    gridTemplateColumns: gridTemplate,
                    height: `${item.size}px`,
                    transform: `translateY(${item.start}px)`,
                  }}
                  role="button"
                  tabIndex={0}
                  data-id={span.id}
                  onClick={() => {
                    handleRowActivate(span);
                  }}
                  onKeyDown={(e) => {
                    handleRowKeyDown(e, span);
                  }}
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
                      title={`${span.name} · ${formatDuration(durationNs)}`}
                      mouseEnterDelay={0.2}
                    >
                      <div
                        className={barClasses}
                        style={{
                          left: `${leftPct.toFixed(4)}%`,
                          width: `max(${widthPct.toFixed(4)}%, var(--size-hairline))`,
                          background: colorForKind(span.kind),
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
