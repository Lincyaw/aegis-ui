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

import { EmptyState } from './EmptyState';
import './TimelineChart.css';

export interface TimelineSpan {
  id: string;
  label: string;
  startNs: number;
  durationNs: number;
  depth?: number;
  kind?: string;
  badge?: ReactNode;
  status?: 'ok' | 'error' | 'warn';
}

export interface TimelineChartProps {
  spans: TimelineSpan[];
  minNs?: number;
  maxNs?: number;
  rowHeight?: number;
  maxVisibleRows?: number;
  onSpanClick?: (span: TimelineSpan) => void;
  selectedId?: string;
  loading?: boolean;
  className?: string;
}

const LABEL_WIDTH = 280;
const INDENT_PX = 12;
const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_MAX_VISIBLE_ROWS = 20;
const APPROX_TICK_COUNT = 6;

const PALETTE = [
  'var(--avatar-hue-1)',
  'var(--avatar-hue-2)',
  'var(--avatar-hue-3)',
  'var(--avatar-hue-4)',
  'var(--avatar-hue-5)',
  'var(--bg-inverted)',
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function colorForKind(kind: string | undefined): string {
  if (kind === undefined || kind.length === 0) {
    return 'var(--bg-inverted)';
  }
  return PALETTE[hashString(kind) % PALETTE.length] ?? 'var(--bg-inverted)';
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

function niceStep(rawStep: number): number {
  if (rawStep <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exponent);
  const normalized = rawStep / base;
  let nice: number;
  if (normalized <= 1) {
    nice = 1;
  } else if (normalized <= 2) {
    nice = 2;
  } else if (normalized <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * base;
}

function buildTicks(minNs: number, maxNs: number): TickSpec[] {
  const range = maxNs - minNs;
  if (range <= 0) {
    return [];
  }
  const step = niceStep(range / APPROX_TICK_COUNT);
  const unit = pickUnit(range);
  const ticks: TickSpec[] = [];
  const first = Math.ceil(minNs / step) * step;
  for (let v = first; v <= maxNs; v += step) {
    const relative = v - minNs;
    const value = relative / unit.perNs;
    const fractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    ticks.push({
      ns: v,
      label: `${formatThousands(value, fractionDigits)} ${unit.label}`,
    });
  }
  return ticks;
}

function emptyDeriveBounds(): { minNs: number; maxNs: number } {
  return { minNs: 0, maxNs: 1 };
}

export function TimelineChart({
  spans,
  minNs: minNsProp,
  maxNs: maxNsProp,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
  onSpanClick,
  selectedId,
  loading = false,
  className,
}: TimelineChartProps): ReactNode {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackHeaderRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const guideLabelRef = useRef<HTMLDivElement>(null);
  const [hasSpans, setHasSpans] = useState(spans.length > 0);

  if (hasSpans !== spans.length > 0) {
    setHasSpans(spans.length > 0);
  }

  const derived = useMemo(() => {
    if (spans.length === 0) {
      return emptyDeriveBounds();
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of spans) {
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
  }, [spans]);

  const minNs = minNsProp ?? derived.minNs;
  const maxNs = maxNsProp ?? derived.maxNs;
  const range = Math.max(maxNs - minNs, 1);

  const ticks = useMemo(() => buildTicks(minNs, maxNs), [minNs, maxNs]);

  const virtualizer = useVirtualizer({
    count: spans.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const bodyHeight = Math.min(spans.length, maxVisibleRows) * rowHeight;

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
    (span: TimelineSpan) => {
      onSpanClick?.(span);
    },
    [onSpanClick],
  );

  const handleRowKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, span: TimelineSpan) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRowActivate(span);
      }
    },
    [handleRowActivate],
  );

  const gridTemplate = `${LABEL_WIDTH}px 1fr`;

  const rootClassName = ['aegis-timeline', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <div
        className="aegis-timeline__axis"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="aegis-timeline__axis-label-gutter" aria-hidden="true" />
        <div className="aegis-timeline__axis-ticks" ref={trackHeaderRef}>
          {ticks.map((tick) => {
            const left = ((tick.ns - minNs) / range) * 100;
            return (
              <div
                key={tick.ns}
                className="aegis-timeline__tick"
                style={{ left: `${left.toFixed(4)}%` }}
              >
                <span className="aegis-timeline__tick-label">{tick.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          className="aegis-timeline__body"
          style={{ height: `${bodyHeight || rowHeight * 6}px` }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aegis-timeline__skeleton-row"
              style={{
                gridTemplateColumns: gridTemplate,
                height: `${rowHeight}px`,
              }}
            >
              <div className="aegis-timeline__skeleton" />
              <div className="aegis-timeline__skeleton" />
            </div>
          ))}
        </div>
      ) : !hasSpans ? (
        <div className="aegis-timeline__empty">
          <EmptyState title="No spans" description="Nothing to plot yet." />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="aegis-timeline__body"
          style={{ height: `${bodyHeight}px` }}
        >
          <div
            className="aegis-timeline__virtual"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={guideRef}
              className="aegis-timeline__guide"
              aria-hidden="true"
            >
              <div
                ref={guideLabelRef}
                className="aegis-timeline__guide-label"
              />
            </div>
            {virtualizer.getVirtualItems().map((item) => {
              const span = spans[item.index];
              const depth = span.depth ?? 0;
              const leftPct = ((span.startNs - minNs) / range) * 100;
              const widthPct = (span.durationNs / range) * 100;
              const isSelected = selectedId === span.id;
              const classes = [
                'aegis-timeline__row',
                isSelected ? 'aegis-timeline__row--selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const barClasses = [
                'aegis-timeline__bar',
                span.status === 'error' ? 'aegis-timeline__bar--error' : '',
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
                    className="aegis-timeline__label"
                    style={{
                      paddingLeft: `calc(var(--space-3) + ${depth * INDENT_PX}px)`,
                    }}
                    title={span.label}
                  >
                    <span className="aegis-timeline__label-text">
                      {span.label}
                    </span>
                  </div>
                  <div className="aegis-timeline__track">
                    <Tooltip
                      title={`${span.label} · ${formatDuration(span.durationNs)}`}
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
                          <span className="aegis-timeline__bar-badge">
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
