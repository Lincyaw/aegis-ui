import { useEffect, useMemo, useState } from 'react';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  MonoValue,
  Select,
  StatusDot,
  Tabs,
  type TraceSpan,
  TraceSpanInspector,
  TraceTree,
} from '@lincyaw/aegis-ui';

import type { ArrowColumnInfo } from '../../api/arrow';
import {
  detectTraceMapping,
  formatMs,
  groupRowsByTrace,
  type TraceBundle,
} from '../../domain/traceSpans';

type Row = Record<string, unknown>;

interface ResultViewProps {
  rows: Row[];
  columns: ArrowColumnInfo[];
}

type ViewMode = 'table' | 'trace';

const RIBBON_INLINE_LIMIT = 12;

export function ResultView({ rows, columns }: ResultViewProps) {
  const traceMapping = useMemo(() => detectTraceMapping(columns), [columns]);
  const traces = useMemo(
    () => (traceMapping ? groupRowsByTrace(rows, traceMapping) : []),
    [rows, traceMapping]
  );
  const hasTrace = traces.length > 0;
  const [mode, setMode] = useState<ViewMode>(hasTrace ? 'trace' : 'table');

  if (rows.length === 0) {
    return (
      <EmptyState title='No rows' description='The query returned zero rows.' />
    );
  }

  const items = hasTrace
    ? [
        { key: 'table', label: 'Table' },
        { key: 'trace', label: `Trace · ${String(traces.length)}` },
      ]
    : [{ key: 'table', label: 'Table' }];

  return (
    <div className='injection-data__result'>
      {hasTrace && (
        <Tabs
          activeKey={mode}
          onChange={(k) => {
            setMode(k === 'trace' ? 'trace' : 'table');
          }}
          items={items}
        />
      )}
      {mode === 'trace' && hasTrace ? (
        <TraceMultiView traces={traces} />
      ) : (
        <TableView rows={rows} columns={columns} />
      )}
    </div>
  );
}

function TableView({
  rows,
  columns,
}: {
  rows: Row[];
  columns: ArrowColumnInfo[];
}) {
  const tableColumns: Array<DataTableColumn<Row>> = useMemo(
    () =>
      columns.map((c) => ({
        key: c.name,
        header: c.name,
        render: (r) => renderCell(r[c.name]),
      })),
    [columns]
  );

  return (
    <DataTable<Row>
      framed={false}
      data={rows}
      rowKey={(_r, i) => String(i)}
      columns={tableColumns}
    />
  );
}

function TraceMultiView({ traces }: { traces: TraceBundle[] }) {
  const [selectedId, setSelectedId] = useState<string>(
    traces[0]?.traceId ?? ''
  );
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  // If the result set changes (new query), reset selection to the top trace.
  useEffect(() => {
    if (traces.length > 0 && !traces.some((t) => t.traceId === selectedId)) {
      setSelectedId(traces[0].traceId);
    }
  }, [traces, selectedId]);

  const selected = traces.find((t) => t.traceId === selectedId) ?? traces[0];
  const spanLookup = useMemo(() => {
    const map = new Map<string, TraceSpan>();
    if (selected) {
      selected.spans.forEach((s) => {
        map.set(s.id, s);
      });
    }
    return (id: string): TraceSpan | undefined => map.get(id);
  }, [selected]);

  if (!selected) {
    return (
      <EmptyState
        title='No spans'
        description='Result columns matched the trace heuristic but no usable rows came back.'
      />
    );
  }

  return (
    <div className='injection-data__trace'>
      {traces.length > 1 ? (
        <TraceRibbon
          traces={traces}
          selectedId={selected.traceId}
          onSelect={setSelectedId}
        />
      ) : null}
      <TraceCaption trace={selected} singleton={traces.length === 1} />
      <TraceTree
        spans={selected.spans}
        selectedId={selectedSpan?.id}
        onSelect={setSelectedSpan}
        persistKey='injection-data-spans'
      />
      <TraceSpanInspector
        span={selectedSpan}
        onClose={() => setSelectedSpan(null)}
        spanLookup={spanLookup}
        onSelectRelated={setSelectedSpan}
      />
    </div>
  );
}

function TraceRibbon({
  traces,
  selectedId,
  onSelect,
}: {
  traces: TraceBundle[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const inline = traces.slice(0, RIBBON_INLINE_LIMIT);
  const overflow = traces.slice(RIBBON_INLINE_LIMIT);
  const overflowSelected = overflow.find((t) => t.traceId === selectedId);
  return (
    <div className='injection-data__trace-ribbon' role='tablist'>
      {inline.map((t) => (
        <TraceRibbonItem
          key={t.traceId}
          trace={t}
          selected={t.traceId === selectedId}
          onSelect={onSelect}
        />
      ))}
      {overflowSelected ? (
        <TraceRibbonItem
          trace={overflowSelected}
          selected
          onSelect={onSelect}
        />
      ) : null}
      {overflow.length > 0 ? (
        <Select
          ariaLabel={`Select from ${String(overflow.length)} more traces`}
          value={overflowSelected ? overflowSelected.traceId : ''}
          placeholder={`+${String(overflow.length)} more`}
          onChange={onSelect}
          options={overflow.map((t) => ({
            value: t.traceId,
            label: `${t.hasError ? '⚠ ' : ''}${t.rootName} · ${String(t.spanCount)} spans · ${formatMs(t.durationMs)}`,
          }))}
        />
      ) : null}
    </div>
  );
}

function TraceRibbonItem({
  trace,
  selected,
  onSelect,
}: {
  trace: TraceBundle;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Chip
      tone={selected ? 'ink' : trace.hasError ? 'warning' : 'default'}
      leading={<StatusDot tone={trace.hasError ? 'warning' : 'ink'} />}
      onClick={() => {
        onSelect(trace.traceId);
      }}
    >
      <span
        className='injection-data__trace-ribbon-label'
        title={`${trace.rootName} · ${trace.traceId}`}
      >
        {trace.rootName}
      </span>
      <span className='injection-data__trace-ribbon-meta'>
        {`${String(trace.spanCount)} · ${formatMs(trace.durationMs)}`}
      </span>
    </Chip>
  );
}

function TraceCaption({
  trace,
  singleton,
}: {
  trace: TraceBundle;
  singleton: boolean;
}) {
  return (
    <div className='injection-data__trace-caption'>
      {singleton ? (
        <StatusDot tone={trace.hasError ? 'warning' : 'ink'} />
      ) : null}
      <span className='injection-data__trace-caption-name'>
        {trace.rootName}
      </span>
      <MonoValue size='sm'>{trace.traceId}</MonoValue>
      <MonoValue size='sm'>{`${String(trace.spanCount)} spans`}</MonoValue>
      <MonoValue size='sm'>{formatMs(trace.durationMs)}</MonoValue>
      {trace.truncated ? (
        <span
          className='injection-data__trace-caption-warn'
          title='Some parent spans are missing from the result — LIMIT may have truncated this trace.'
        >
          ⚠ truncated by LIMIT
        </span>
      ) : null}
    </div>
  );
}

function renderCell(v: unknown): string {
  if (v === null || v === undefined) {
    return '—';
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
