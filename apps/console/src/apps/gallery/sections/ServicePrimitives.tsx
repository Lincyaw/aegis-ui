import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Button as AegisButton,
  Select as AegisSelect,
  BucketCard,
  Chip,
  CodeEditor,
  type CodeEditorField,
  compileLuceneToSql,
  DiffViewer,
  type FieldMapping,
  FileDropzone,
  FilePreview,
  FolderDropzone,
  LocaleProvider,
  MetadataList,
  MetricLabel,
  MonoValue,
  ObjectBrowser,
  ObjectInspector,
  Panel,
  PanelTitle,
  ParquetViewer,
  PickerField,
  QueryAutocomplete,
  type QueryAutocompleteFieldSuggestion,
  type QueryAutocompleteValueSuggestion,
  ResizableSidePanel,
  type SavedQuery,
  SavedQueryBar,
  SearchInput,
  SectionDivider,
  ServiceMap,
  type ServiceMapEdge,
  type ServiceMapNode,
  ShareLinkDialog,
  Timeline,
  TimelineChart,
  type TimelineSpan,
  Toolbar,
  ToolCallCard,
  type TraceSpan,
  TraceSpanInspector,
  TraceTree,
  UploadQueue,
  useCopyToClipboard,
  zhCNStrings,
} from '@lincyaw/aegis-ui';

import { TOOL_QUERY_METRICS } from '../fixtures';
import { Specimen } from '../shared';

/* ── EnvironmentSwitcher specimen ──────────────────────────────────── */

const QUERY_AC_FIELDS: QueryAutocompleteFieldSuggestion[] = [
  { value: 'service.name', hint: 'string' },
  { value: 'service.version', hint: 'string' },
  { value: 'http.status', hint: 'number' },
  { value: 'http.method', hint: 'string' },
  { value: 'duration', hint: 'number (µs)' },
  { value: 'error', hint: 'bool' },
];

const QUERY_AC_FIELD_MAPPINGS: FieldMapping[] = [
  { field: 'service.name', sqlExpr: 'ServiceName' },
  { field: 'service.version', sqlExpr: "SpanAttributes['service.version']" },
  { field: 'http.status', sqlExpr: 'HttpStatus', kind: 'number' },
  { field: 'http.method', sqlExpr: "SpanAttributes['http.method']" },
  { field: 'duration', sqlExpr: 'Duration', kind: 'number' },
  { field: 'error', sqlExpr: 'IsError', kind: 'bool' },
];

const QUERY_AC_VALUE_POOL: Record<string, QueryAutocompleteValueSuggestion[]> =
  {
    'service.name': [
      { value: 'frontend', hint: '4.1k events' },
      { value: 'checkout', hint: '912 events' },
      { value: 'auth', hint: '410 events' },
      { value: 'foo', hint: 'sample' },
    ],
    'http.status': [
      { value: '200', hint: 'OK' },
      { value: '404', hint: 'Not Found' },
      { value: '500', hint: 'Internal Error' },
    ],
    'http.method': [
      { value: 'GET' },
      { value: 'POST' },
      { value: 'PUT' },
      { value: 'DELETE' },
    ],
    error: [{ value: 'true' }, { value: 'false' }],
  };

function QueryAutocompleteSpecimen(): ReactNode {
  const [empty, setEmpty] = useState('');
  const [prefilled, setPrefilled] = useState(
    'service.name:foo AND duration:>1000'
  );
  const valueSuggestions = useCallback(
    (field: string, _prefix: string): QueryAutocompleteValueSuggestion[] =>
      QUERY_AC_VALUE_POOL[field] ?? [],
    []
  );
  const compiled = useMemo(
    () =>
      compileLuceneToSql(prefilled, {
        fields: QUERY_AC_FIELD_MAPPINGS,
      }),
    [prefilled]
  );
  return (
    <div className='gallery__row gallery__row--wide'>
      <Specimen caption='empty · field-name suggestions on focus' span={2}>
        <QueryAutocomplete
          value={empty}
          onChange={setEmpty}
          fieldSuggestions={QUERY_AC_FIELDS}
          valueSuggestions={valueSuggestions}
        />
      </Specimen>
      <Specimen caption='pre-filled · compiled WHERE updates live' span={2}>
        <QueryAutocomplete
          value={prefilled}
          onChange={setPrefilled}
          fieldSuggestions={QUERY_AC_FIELDS}
          valueSuggestions={valueSuggestions}
        />
        <pre
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-muted)',
            border: 'var(--size-hairline) solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-12)',
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {`WHERE ${compiled.sql || '(no filter)'}\n\nparams = ${JSON.stringify(
            compiled.params,
            null,
            2
          )}\nreferencedFields = ${JSON.stringify(compiled.referencedFields)}`}
        </pre>
      </Specimen>
    </div>
  );
}

function SavedQueryBarSpecimen(): ReactNode {
  const emptyNs = 'gallery.saved-queries.empty';
  const seededNs = 'gallery.saved-queries.seeded';
  const [emptyValue, setEmptyValue] = useState('status:queued');
  const [seededValue, setSeededValue] = useState('service.name:checkout');
  const [lastApplied, setLastApplied] = useState<SavedQuery | null>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem(`aegis.saved-queries.${emptyNs}`);
      const seededKey = `aegis.saved-queries.${seededNs}`;
      if (window.localStorage.getItem(seededKey) === null) {
        const now = Date.now();
        const seed: SavedQuery[] = [
          {
            id: 'seed-failed',
            name: 'Failed runs · 24h',
            value: 'status:failed AND ts:>now-24h',
            pinned: true,
            lastUsedAt: now - 1000,
          },
          {
            id: 'seed-slow',
            name: 'Slow traces',
            value: 'duration:>1000ms',
            pinned: true,
            lastUsedAt: now - 2000,
          },
          {
            id: 'seed-checkout',
            name: 'Checkout errors',
            value: 'service.name:checkout AND error:true',
            pinned: false,
            lastUsedAt: now - 3000,
          },
        ];
        window.localStorage.setItem(seededKey, JSON.stringify(seed));
      }
    } catch {
      /* localStorage unavailable in this environment */
    }
  }, []);

  return (
    <div className='gallery__row gallery__row--wide'>
      <Specimen caption='empty · save current to seed' span={2}>
        <SearchInput
          value={emptyValue}
          onChange={setEmptyValue}
          placeholder='Try a query, then save it…'
        />
        <SavedQueryBar
          namespace={emptyNs}
          currentValue={emptyValue}
          onApply={(q) => {
            setEmptyValue(q.value);
            setLastApplied(q);
          }}
        />
      </Specimen>
      <Specimen caption='seeded · 2 pinned + 1 unpinned' span={2}>
        <SearchInput
          value={seededValue}
          onChange={setSeededValue}
          placeholder='Search…'
        />
        <SavedQueryBar
          namespace={seededNs}
          currentValue={seededValue}
          onApply={(q) => {
            setSeededValue(q.value);
            setLastApplied(q);
          }}
        />
        <pre
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-muted)',
            border: 'var(--size-hairline) solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-11)',
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {lastApplied
            ? `last applied = ${JSON.stringify(
                {
                  name: lastApplied.name,
                  value: lastApplied.value,
                  pinned: lastApplied.pinned,
                },
                null,
                2
              )}`
            : '(click a chip to apply)'}
        </pre>
      </Specimen>
    </div>
  );
}

const SQL_EDITOR_FIELDS: CodeEditorField[] = [
  { name: 'TraceId' },
  { name: 'SpanName' },
  { name: 'Duration', type: 'UInt64' },
  { name: 'StatusCode', type: 'String' },
];

function SqlCodeEditorSpecimen(): ReactNode {
  const [value, setValue] = useState(
    'SELECT TraceId, SpanName\nFROM otel_traces\nWHERE Duration > 1000'
  );
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <>
      <CodeEditor
        value={value}
        language='sql'
        onChange={setValue}
        onSubmit={setSubmitted}
        fields={SQL_EDITOR_FIELDS}
        tables={['otel_traces', 'otel_logs', 'otel_metrics']}
        height={160}
      />
      <pre
        style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--bg-muted)',
          border: 'var(--size-hairline) solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-11)',
          color: 'var(--text-main)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {submitted == null
          ? 'press Cmd+Enter / Ctrl+Enter to submit'
          : `submitted → ${submitted}`}
      </pre>
    </>
  );
}

function CopyToClipboardSpecimen(): ReactNode {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <AegisButton
      tone='secondary'
      onClick={() => {
        void copy('3f9c2a1b7d04');
      }}
    >
      {copied ? 'Copied' : 'Copy 3f9c2a1b7d04'}
    </AegisButton>
  );
}

function SearchInputSpecimen(): ReactNode {
  const [query, setQuery] = useState('trace-snapshot.json');
  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      onClear={() => {
        setQuery('');
      }}
      placeholder='Search files…'
    />
  );
}

function ObjectInspectorSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <div className='gallery__row'>
      <Specimen caption='toggle to open inspector'>
        <AegisButton onClick={() => setOpen(true)}>
          Open ObjectInspector
        </AegisButton>
        <ObjectInspector
          open={open}
          onClose={() => setOpen(false)}
          title='trace-snapshot.json'
          subtitle='datasets/2026-05/trace-snapshot.json'
          defaultTabId='summary'
          actions={
            <>
              <Chip tone='ghost'>Download</Chip>
              <Chip tone='ghost'>Copy URL</Chip>
              <Chip tone='ghost'>Share</Chip>
              <Chip tone='warning'>Delete</Chip>
            </>
          }
          tabs={[
            {
              id: 'summary',
              label: 'Summary',
              content: (
                <MetadataList
                  entries={[
                    {
                      label: 'Key',
                      value: 'datasets/2026-05/trace-snapshot.json',
                      mono: true,
                      copyable: true,
                    },
                    { label: 'Size', value: '4.2 MB', mono: true },
                    {
                      label: 'Content-Type',
                      value: 'application/json',
                      mono: true,
                    },
                    { label: 'Last modified', value: '2026-05-14 08:21 UTC' },
                    {
                      label: 'ETag',
                      value: '"a3f29c8d0e11b7ce2a4f1d6e90b5a823"',
                      mono: true,
                      copyable: true,
                    },
                  ]}
                />
              ),
            },
            {
              id: 'preview',
              label: 'Preview',
              content: (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-13)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Preview placeholder — host renders FilePreview here.
                </div>
              ),
            },
            {
              id: 'parquet',
              label: 'Parquet',
              content: (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-13)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Parquet viewer placeholder — host renders ParquetViewer here.
                </div>
              ),
            },
            {
              id: 'audit-log',
              label: 'Audit log',
              disabled: true,
              hint: 'Coming soon',
              content: null,
            },
          ]}
          width={680}
        />
      </Specimen>
    </div>
  );
}

function ParquetViewerSpecimen(): ReactNode {
  const [file, setFile] = useState<File | undefined>();
  return (
    <div className='gallery__stack'>
      <FileDropzone
        onDrop={(files) => {
          if (files[0]) {
            setFile(files[0]);
          }
        }}
        accept={{ 'application/octet-stream': ['.parquet'] }}
        multiple={false}
      />
      <ParquetViewer
        file={file}
        title={file?.name ?? 'Parquet preview'}
        surface={{
          id: 'gallery.parquet.preview',
          kind: 'preview',
          label: 'Parquet preview',
          askSuggestions: ['Describe this file'],
          project: (data) => ({
            fields: [
              { name: 'totalRows', type: 'number', value: data.totalRows },
              {
                name: 'columnCount',
                type: 'number',
                value: data.columns.length,
              },
            ],
          }),
        }}
      />
    </div>
  );
}

const traceTreeDemoSpans: TraceSpan[] = [
  {
    id: 's',
    name: 'invoke_agent general_purpose',
    startMs: 0,
    durationMs: 1840,
    status: 'ok',
    kind: 'session',
  },
  {
    id: 't0',
    parentId: 's',
    name: 'agentm.turn',
    startMs: 12,
    durationMs: 905,
    status: 'ok',
    kind: 'turn 0',
  },
  {
    id: 't0-llm',
    parentId: 't0',
    name: 'chat claude-opus-4-7',
    startMs: 18,
    durationMs: 642,
    status: 'ok',
    kind: 'llm',
  },
  {
    id: 't0-tool',
    parentId: 't0',
    name: 'execute_tool bash',
    startMs: 670,
    durationMs: 230,
    status: 'ok',
    kind: 'tool',
  },
  {
    id: 't1',
    parentId: 's',
    name: 'agentm.turn',
    startMs: 940,
    durationMs: 880,
    status: 'error',
    kind: 'turn 1',
  },
  {
    id: 't1-llm',
    parentId: 't1',
    name: 'chat claude-opus-4-7',
    startMs: 945,
    durationMs: 410,
    status: 'ok',
    kind: 'llm',
  },
  {
    id: 't1-tool',
    parentId: 't1',
    name: 'execute_tool http_get',
    startMs: 1360,
    durationMs: 455,
    status: 'error',
    kind: 'tool',
  },
];

function TraceTreeSpecimen(): ReactNode {
  const [selected, setSelected] = useState<TraceSpan | null>(null);
  const lookup = (id: string): TraceSpan | undefined =>
    traceTreeDemoSpans.find((s) => s.id === id);
  return (
    <>
      <TraceTree
        spans={traceTreeDemoSpans}
        selectedId={selected?.id}
        onSelect={setSelected}
        persistKey='gallery-trace-tree'
        surface={{
          id: 'gallery.trace.tree',
          kind: 'tree',
          label: 'OTel trace tree',
          askSuggestions: ['Which span is failing?'],
          project: (spans) => ({
            entities: spans.map((sp) => ({
              id: sp.id,
              type: 'span',
              label: sp.name,
              data: { status: sp.status, durationMs: sp.durationMs },
            })),
          }),
        }}
      />
      <TraceSpanInspector
        span={selected}
        onClose={() => setSelected(null)}
        spanLookup={lookup}
        onSelectRelated={setSelected}
      />
    </>
  );
}

const traceTreeMixedSpans: TraceSpan[] = [
  { id: 'step-1', name: '01 query_metrics', startMs: 0, durationMs: 1240 },
  {
    id: 'step-1-call',
    parentId: 'step-1',
    name: 'query_metrics service=catalog',
    status: 'ok',
    kind: 'tool',
  },
  { id: 'step-2', name: '02 read_file', startMs: 1240, durationMs: 890 },
  {
    id: 'step-2-call',
    parentId: 'step-2',
    name: 'read_file /etc/redis/pool.conf',
    status: 'error',
    kind: 'tool',
  },
  { id: 'step-3', name: '03 report_rca', startMs: 2130 },
];

const traceTreeUntimedSpans: TraceSpan[] = [
  { id: 'r1', name: 'request 1 · claude-opus-4-7', kind: 'request' },
  { id: 'r1-in', parentId: 'r1', name: 'user: Why is catalog slow?' },
  { id: 'r1-out', parentId: 'r1', name: 'response: Checking metrics…' },
  { id: 'r2', name: 'request 2 · claude-opus-4-7', kind: 'request' },
  { id: 'r2-in', parentId: 'r2', name: 'function_call_output: 482 ms' },
];

function TraceTreeMixedTimingSpecimen(): ReactNode {
  const [selected, setSelected] = useState<TraceSpan | null>(null);
  return (
    <>
      <TraceTree
        spans={traceTreeMixedSpans}
        selectedId={selected?.id}
        onSelect={setSelected}
      />
      <TraceSpanInspector
        span={selected}
        onClose={() => setSelected(null)}
        detail={
          selected?.kind === 'tool' ? (
            <ToolCallCard data={TOOL_QUERY_METRICS} />
          ) : undefined
        }
      />
    </>
  );
}

function TraceSpanInspectorSpecimen(): ReactNode {
  const sample: TraceSpan = {
    id: 'sample',
    parentId: null,
    name: 'POST /api/v2/projects/19/injections/inject',
    startMs: 0,
    durationMs: 184.2,
    status: 'ok',
    kind: 'http',
    attrs: {
      'http.method': 'POST',
      'http.status_code': 200,
      'net.peer.name': 'orchestrator.internal',
      'rpc.service': 'aegislab.OrchestratorService',
    },
  };
  const [open, setOpen] = useState<TraceSpan | null>(null);
  return (
    <div>
      <AegisButton tone='secondary' onClick={() => setOpen(sample)}>
        Open span inspector
      </AegisButton>
      <TraceSpanInspector span={open} onClose={() => setOpen(null)} />
    </div>
  );
}

const NS_PER_MS = 1_000_000;

const timelineDepthSpans: TimelineSpan[] = [
  {
    id: 'root',
    label: 'http.request POST /v1/sessions',
    startNs: 0,
    durationNs: 1800 * NS_PER_MS,
    depth: 0,
    kind: 'http',
    status: 'ok',
  },
  {
    id: 'auth',
    label: 'auth.verify_jwt',
    startNs: 12 * NS_PER_MS,
    durationNs: 84 * NS_PER_MS,
    depth: 1,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'db.session.lookup',
    label: 'db.session.lookup',
    startNs: 110 * NS_PER_MS,
    durationNs: 220 * NS_PER_MS,
    depth: 1,
    kind: 'db',
    status: 'ok',
  },
  {
    id: 'db.session.lookup.query',
    label: 'pg.exec SELECT * FROM sessions',
    startNs: 130 * NS_PER_MS,
    durationNs: 180 * NS_PER_MS,
    depth: 2,
    kind: 'db',
    status: 'ok',
  },
  {
    id: 'llm.call',
    label: 'llm.call gpt-5',
    startNs: 340 * NS_PER_MS,
    durationNs: 1200 * NS_PER_MS,
    depth: 1,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'llm.call.tokenize',
    label: 'tokenize',
    startNs: 350 * NS_PER_MS,
    durationNs: 40 * NS_PER_MS,
    depth: 2,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'llm.call.network',
    label: 'http.fetch openai',
    startNs: 400 * NS_PER_MS,
    durationNs: 1130 * NS_PER_MS,
    depth: 2,
    kind: 'http',
    status: 'error',
  },
  {
    id: 'persist',
    label: 'db.session.update',
    startNs: 1560 * NS_PER_MS,
    durationNs: 220 * NS_PER_MS,
    depth: 1,
    kind: 'db',
    status: 'ok',
  },
];

function TimelineChartDepthSpecimen(): ReactNode {
  return <TimelineChart spans={timelineDepthSpans} maxVisibleRows={10} />;
}

function makeLargeTimeline(): TimelineSpan[] {
  const kinds = ['http', 'db', 'compute'] as const;
  const spans: TimelineSpan[] = [];
  let cursor = 0;
  for (let i = 0; i < 500; i++) {
    const kind = kinds[i % kinds.length] ?? 'compute';
    const base = kind === 'http' ? 30 : kind === 'db' ? 12 : 5;
    const dur = base * NS_PER_MS * (1 + (i % 7) * 0.15);
    spans.push({
      id: `s-${i}`,
      label: `${kind}.op[${i}]`,
      startNs: cursor,
      durationNs: dur,
      depth: i % 4,
      kind,
      status: i % 53 === 0 ? 'error' : 'ok',
    });
    cursor += dur * 0.6;
  }
  return spans;
}

function TimelineChartLargeSpecimen(): ReactNode {
  const spans = useMemo(() => makeLargeTimeline(), []);
  return <TimelineChart spans={spans} maxVisibleRows={12} />;
}

function TimelineChartSelectableSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string>('llm.call.network');
  return (
    <TimelineChart
      spans={timelineDepthSpans}
      selectedId={selected}
      maxVisibleRows={10}
      onSpanClick={(s) => {
        setSelected(s.id);
        console.warn('TimelineChart click:', s.id, s.label);
      }}
    />
  );
}

const SERVICE_MAP_MICRO_NODES: ServiceMapNode[] = [
  { id: 'gateway', label: 'gateway', sublabel: 'edge · 4 pods', status: 'ok' },
  { id: 'auth', label: 'auth-service', sublabel: 'p99 142ms', status: 'ok' },
  {
    id: 'orders',
    label: 'orders-service',
    sublabel: 'p99 980ms',
    status: 'warn',
    badge: 12,
  },
  {
    id: 'inventory',
    label: 'inventory-service',
    sublabel: '5xx 4.2%',
    status: 'error',
    badge: 87,
  },
  { id: 'cache', label: 'redis', sublabel: 'cache', status: 'muted' },
  { id: 'db', label: 'postgres', sublabel: 'primary', status: 'ok' },
];

const SERVICE_MAP_MICRO_EDGES: ServiceMapEdge[] = [
  {
    id: 'e1',
    source: 'gateway',
    target: 'auth',
    label: '1.2k/s',
    status: 'ok',
  },
  {
    id: 'e2',
    source: 'gateway',
    target: 'orders',
    label: '820/s',
    status: 'warn',
  },
  {
    id: 'e3',
    source: 'gateway',
    target: 'inventory',
    label: '610/s',
    status: 'error',
  },
  {
    id: 'e4',
    source: 'orders',
    target: 'inventory',
    label: '410/s',
    status: 'error',
  },
  {
    id: 'e5',
    source: 'orders',
    target: 'cache',
    label: '2.4k/s',
    status: 'muted',
  },
  { id: 'e6', source: 'inventory', target: 'db', label: '610/s', status: 'ok' },
  { id: 'e7', source: 'auth', target: 'db', label: '200/s', status: 'ok' },
];

function ServiceMapMicroSpecimen(): ReactNode {
  return (
    <ServiceMap
      nodes={SERVICE_MAP_MICRO_NODES}
      edges={SERVICE_MAP_MICRO_EDGES}
      height={420}
      selectedNodeId='inventory'
    />
  );
}

function buildAgentDag(): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  const nodes: ServiceMapNode[] = [
    { id: 'root', label: 'agent · root', sublabel: 'session#42', status: 'ok' },
  ];
  const edges: ServiceMapEdge[] = [];
  for (let t = 1; t <= 4; t += 1) {
    const turnId = `turn-${String(t)}`;
    const turnStatus: ServiceMapNode['status'] = t === 3 ? 'warn' : 'ok';
    nodes.push({
      id: turnId,
      label: `turn ${String(t)}`,
      sublabel: t === 3 ? 'retry · throttled' : 'tool plan',
      status: turnStatus,
    });
    edges.push({
      id: `r-${turnId}`,
      source: 'root',
      target: turnId,
      status: turnStatus,
    });
    const toolCount = t === 4 ? 1 : t === 1 ? 3 : 2;
    for (let i = 0; i < toolCount; i += 1) {
      const toolId = `${turnId}-tool-${String(i)}`;
      const isErr = t === 3 && i === 0;
      nodes.push({
        id: toolId,
        label: isErr ? 'fs.write' : 'bash.exec',
        sublabel: isErr ? 'EACCES' : `tool#${String(i + 1)}`,
        status: isErr ? 'error' : 'ok',
        badge: isErr ? 'fail' : undefined,
      });
      edges.push({
        id: `${turnId}-e-${String(i)}`,
        source: turnId,
        target: toolId,
        status: isErr ? 'error' : 'ok',
      });
    }
  }
  return { nodes, edges };
}

function ServiceMapAgentSpecimen(): ReactNode {
  const { nodes, edges } = buildAgentDag();
  return <ServiceMap nodes={nodes} edges={edges} direction='TB' height={460} />;
}

function ServiceMapSingleSpecimen(): ReactNode {
  return (
    <ServiceMap
      nodes={[
        {
          id: 'only',
          label: 'orphan-service',
          sublabel: 'no callers',
          status: 'muted',
        },
      ]}
      edges={[]}
      height={300}
    />
  );
}

function ResizableSidePanelSpecimen(): ReactNode {
  const [rightCollapsed, setRightCollapsed] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 'var(--space-2)',
        width: '100%',
        height: 320,
        alignItems: 'stretch',
      }}
    >
      <ResizableSidePanel side='left' defaultWidth={280}>
        <div style={{ padding: 'var(--space-4)' }}>
          <MetricLabel as='div' size='xs'>
            Left · 280px · non-collapsible
          </MetricLabel>
          <p>Drag the right edge to resize. Hard min/max enforced.</p>
        </div>
      </ResizableSidePanel>

      <ResizableSidePanel
        side='left'
        defaultWidth={240}
        persistKey='gallery.resizable.persist'
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <MetricLabel as='div' size='xs'>
            Left · persistKey
          </MetricLabel>
          <p>Resize then reload — width survives via localStorage.</p>
        </div>
      </ResizableSidePanel>

      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          padding: 'var(--space-4)',
          border: 'var(--size-hairline) dashed var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-page)',
        }}
      >
        <MetricLabel as='div' size='xs'>
          Keyboard-only resize demo
        </MetricLabel>
        <p>
          Tab onto either handle (focus ring appears) and press ←/→ to adjust
          width in 16 px steps. Shrinking the right panel below its min
          collapses it.
        </p>
      </div>

      <ResizableSidePanel
        side='right'
        defaultWidth={360}
        collapsible
        collapsed={rightCollapsed}
        onCollapsedChange={setRightCollapsed}
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <MetricLabel as='div' size='xs'>
            Right · 360px · collapsible
          </MetricLabel>
          <p>
            Drag handle past min-width to collapse. Click thin bar to expand.
          </p>
        </div>
      </ResizableSidePanel>
    </div>
  );
}

const CONSTRAINED_MIN_CENTRE = 320;

function ResizableSidePanelConstrainedSpecimen(): ReactNode {
  const rowRef = useRef<HTMLDivElement>(null);
  const centreRef = useRef<HTMLDivElement>(null);
  const keepCentre = useCallback((width: number): number => {
    const panel = rowRef.current?.firstElementChild;
    const centre = centreRef.current;
    if (!panel || !centre) {
      return width;
    }
    const shared =
      panel.getBoundingClientRect().width +
      centre.getBoundingClientRect().width;
    return Math.min(width, shared - CONSTRAINED_MIN_CENTRE);
  }, []);
  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        width: '100%',
        height: 200,
      }}
    >
      <ResizableSidePanel
        side='left'
        defaultWidth={360}
        minWidth={160}
        maxWidth={1200}
        keyboardStep={24}
        constrainWidth={keepCentre}
        resetOnDoubleClick
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <MetricLabel as='div' size='xs'>
            Left · 360px · max 1200px
          </MetricLabel>
          <p>
            Drag right: the handle stops where the centre would drop below 320
            px. ←/→ move 24 px, Home / End jump to min / max, double-click
            restores 360 px.
          </p>
        </div>
      </ResizableSidePanel>
      <div
        ref={centreRef}
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          padding: 'var(--space-4)',
          border: 'var(--size-hairline) dashed var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-page)',
        }}
      >
        <MetricLabel as='div' size='xs'>
          Centre · ≥ 320px
        </MetricLabel>
      </div>
    </div>
  );
}

function ResizableSidePanelStackedSpecimen(): ReactNode {
  return (
    <div className='gallery__resizable-stack'>
      <ResizableSidePanel
        side='left'
        defaultWidth={220}
        minWidth={160}
        maxWidth={400}
        stackOnMobile
      >
        <div style={{ padding: 'var(--space-3)' }}>
          <MetricLabel as='div' size='xs'>
            Turns · stackOnMobile
          </MetricLabel>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i}>
              <MonoValue size='sm'>{String(i + 1).padStart(2, '0')}</MonoValue>{' '}
              turn {i + 1}
            </p>
          ))}
        </div>
      </ResizableSidePanel>
      <div className='gallery__resizable-stack-main'>
        <MetricLabel as='div' size='xs'>
          Viewport
        </MetricLabel>
        <p>
          Desktop: a resizable rail beside the content. Narrow the window to
          ≤768 px and the rail stacks on top at full width, scrolling inside its
          capped height.
        </p>
      </div>
    </div>
  );
}

export function ServicePrimitivesSection() {
  return (
    <Panel
      title={<PanelTitle size='lg'>Service primitives</PanelTitle>}
      extra={<MetricLabel>blob · configcenter · audit</MetricLabel>}
    >
      <SectionDivider extra={<MetricLabel>react-dropzone</MetricLabel>}>
        FileDropzone
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='empty · multi · accept image/*' span={2}>
          <FileDropzone
            onDrop={(files) =>
              console.warn(
                '[demo] dropped',
                files.map((f) => f.name)
              )
            }
            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
            maxSize={5 * 1024 * 1024}
          />
        </Specimen>
        <Specimen caption='with queue · mixed states' span={2}>
          <FileDropzone
            onDrop={() => undefined}
            items={[
              {
                id: 'a',
                file: new File([''], 'corpus-2026-04.tar.gz'),
                status: 'uploading',
                progress: 64,
              },
              {
                id: 'b',
                file: new File([''], 'trace-snapshot.json'),
                status: 'done',
                progress: 100,
              },
              {
                id: 'c',
                file: new File([''], 'too-big.bin'),
                status: 'error',
                error: 'exceeds 5 MB cap',
              },
            ]}
          />
        </Specimen>
        <Specimen caption='disabled'>
          <FileDropzone onDrop={() => undefined} disabled />
        </Specimen>
        <Specimen caption='directory=true'>
          <FileDropzone
            onDrop={() => undefined}
            directory
            hint={
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--fs-14)',
                }}
              >
                Drop a folder or click to select one
              </span>
            }
          />
        </Specimen>
        <Specimen caption='overlay variant (contained)' span={2}>
          <div
            style={{
              position: 'relative',
              height: 200,
              border: 'var(--size-hairline) dashed var(--border-emphasis)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-4)',
                color: 'var(--text-muted)',
              }}
            >
              <MetricLabel>Underlying content</MetricLabel>
            </div>
            <FileDropzone
              onDrop={() => undefined}
              variant='overlay'
              hint={
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 'var(--fw-medium)',
                    fontSize: 'var(--fs-14)',
                  }}
                >
                  Drop files to upload
                </span>
              }
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Directory upload</MetricLabel>}>
        FolderDropzone
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='empty · default' span={2}>
          <FolderDropzone
            value={[]}
            onFilesChange={(files) =>
              console.warn(
                '[demo] folder picked',
                files.map((f) => f.name)
              )
            }
            helperText='10 MiB per file · 50 MiB total · 200 files max'
            maxFileBytes={10 * 1024 * 1024}
            maxTotalBytes={50 * 1024 * 1024}
            maxFiles={200}
          />
        </Specimen>
        <Specimen caption='with files · summary slot' span={2}>
          <FolderDropzone
            value={[
              new File([new Uint8Array(2048)], 'README.md'),
              new File([new Uint8Array(512)], 'docs/intro.md'),
              new File([new Uint8Array(128 * 1024)], 'assets/cover.png'),
            ]}
            onFilesChange={() => undefined}
            helperText='10 MiB per file · 50 MiB total · 200 files max'
            summary={
              <>
                <div>README.md · 2.0 KB</div>
                <div>docs/intro.md · 512 B</div>
                <div>assets/cover.png · 128 KB</div>
              </>
            }
          />
        </Specimen>
        <Specimen caption='disabled'>
          <FolderDropzone
            value={[]}
            onFilesChange={() => undefined}
            disabled
            helperText='Upload disabled'
          />
        </Specimen>
        <Specimen caption='validation error'>
          <FolderDropzone
            value={[new File([new Uint8Array(20)], 'oops.bin')]}
            onFilesChange={() => undefined}
            validationError='At least one .md file is required.'
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Standalone queue</MetricLabel>}>
        UploadQueue
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='mixed states with progress + speed' span={3}>
          <UploadQueue
            items={[
              {
                id: 'q1',
                file: new File([''], 'waiting.tar.gz'),
                status: 'queued',
              },
              {
                id: 'u1',
                file: new File(
                  new Array(50 * 1024 * 1024).fill(0),
                  'corpus-2026-04.tar.gz'
                ),
                status: 'uploading',
                progress: 0.5,
                bytesUploaded: 25 * 1024 * 1024,
                speedBps: 2.4 * 1024 * 1024,
                etaSeconds: 12,
                onCancel: () => undefined,
              },
              {
                id: 'd1',
                file: new File([''], 'trace-snapshot.json'),
                status: 'done',
                progress: 1,
              },
              {
                id: 'e1',
                file: new File([''], 'too-big.bin'),
                status: 'error',
                error: 'exceeds 5 MB cap',
              },
            ]}
            onRetry={() => undefined}
            onDismiss={() => undefined}
            onClearCompleted={() => undefined}
          />
        </Specimen>
        <Specimen caption='empty'>
          <UploadQueue items={[]} />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Blob bucket summary</MetricLabel>}>
        BucketCard
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='s3 bucket'>
          <BucketCard
            name='artifacts'
            driver='s3'
            maxObjectBytes={5 * 1024 * 1024 * 1024}
            retentionDays={90}
            objectCount={1284}
            totalBytes={42 * 1024 * 1024 * 1024}
          />
        </Specimen>
        <Specimen caption='localfs · public · clickable'>
          <BucketCard
            name='scratch'
            driver='localfs'
            publicRead
            objectCount={37}
            totalBytes={4 * 1024 * 1024}
            onClick={() => undefined}
          />
        </Specimen>
        <Specimen caption='minimal'>
          <BucketCard name='shared-uploads' driver='s3' />
        </Specimen>
        <Specimen caption='with quickActions (hover to reveal)'>
          <BucketCard
            name='model-artifacts'
            driver='s3'
            objectCount={5120}
            totalBytes={128 * 1024 * 1024 * 1024}
            quickActions={
              <>
                <Chip tone='ghost'>Settings</Chip>
                <Chip tone='ghost'>Lifecycle</Chip>
              </>
            }
            onClick={() => undefined}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>3-slot generic toolbar</MetricLabel>}>
        Toolbar
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='left + right' span={2}>
          <Toolbar
            left={
              <SearchInput
                value=''
                onChange={() => undefined}
                placeholder='Search objects…'
                kbd='⌘K'
              />
            }
            right={
              <>
                <Chip tone='ghost'>Upload</Chip>
                <Chip tone='ink'>New folder</Chip>
              </>
            }
          />
        </Specimen>
        <Specimen caption='with center slot' span={2}>
          <Toolbar
            left={<SearchInput value='' onChange={() => undefined} />}
            center={
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <Chip tone='ghost'>List</Chip>
                <Chip tone='ink'>Grid</Chip>
              </div>
            }
            right={<Chip tone='ghost'>Filter</Chip>}
          />
        </Specimen>
        <Specimen caption='legacy search + filter chips' span={3}>
          <Toolbar
            searchPlaceholder='Search…'
            searchValue=''
            onSearchChange={() => undefined}
            filters={[{ key: 'type', label: 'type: image' }]}
            onFilterRemove={() => undefined}
            onClearFilters={() => undefined}
            action={<Chip tone='ghost'>Export</Chip>}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Pill · brand focus</MetricLabel>}>
        SearchInput
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='empty with kbd hint'>
          <SearchInput
            value=''
            onChange={() => undefined}
            placeholder='Search…'
            kbd='⌘K'
          />
        </Specimen>
        <Specimen caption='type to filter · clear'>
          <SearchInputSpecimen />
        </Specimen>
        <Specimen caption='no kbd, no value'>
          <SearchInput
            value=''
            onChange={() => undefined}
            placeholder='Filter by prefix…'
          />
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen caption='block · the field fills the box' span={3}>
          <SearchInput
            block
            value='checkout'
            onChange={() => undefined}
            onClear={() => undefined}
          />
        </Specimen>
        <Specimen
          caption='one --size-control-base row · SearchInput · Select · PickerField · Button'
          span={3}
        >
          <Toolbar
            left={
              <>
                <SearchInput
                  value=''
                  onChange={() => undefined}
                  placeholder='Search tasks'
                />
                <AegisSelect
                  ariaLabel='Tag'
                  value='all'
                  options={[
                    { value: 'all', label: 'All tags' },
                    { value: 'sre', label: 'sre · 120' },
                  ]}
                  onChange={() => undefined}
                />
                <PickerField
                  ariaLabel='Compare models'
                  placeholder='All models'
                  onClick={() => undefined}
                />
              </>
            }
            right={<AegisButton tone='secondary'>Export</AegisButton>}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>LuceneQL field:value</MetricLabel>}>
        QueryAutocomplete
      </SectionDivider>
      <QueryAutocompleteSpecimen />

      <SectionDivider
        extra={<MetricLabel>localStorage · namespaced</MetricLabel>}
      >
        SavedQueryBar
      </SectionDivider>
      <SavedQueryBarSpecimen />

      <SectionDivider extra={<MetricLabel>Key/value metadata</MetricLabel>}>
        MetadataList
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='mixed entries' span={2}>
          <MetadataList
            entries={[
              {
                label: 'Key',
                value: 'datasets/2026-05/trace.json',
                mono: true,
                copyable: true,
              },
              { label: 'Size', value: '4.2 MB', mono: true },
              {
                label: 'Content-Type',
                value: 'application/json',
                mono: true,
                copyable: true,
              },
              { label: 'Last modified', value: '2026-05-14 08:21 UTC' },
              {
                label: 'ETag',
                value: '"a3f29c8d0e11b7ce2a4f1d6e90b5a823"',
                mono: true,
                copyable: true,
              },
              { label: 'Storage class', value: 'STANDARD' },
            ]}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Object side-panel</MetricLabel>}>
        ObjectInspector
      </SectionDivider>
      <ObjectInspectorSpecimen />

      <SectionDivider
        extra={<MetricLabel>Prefix tree + table shell</MetricLabel>}
      >
        ObjectBrowser
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='browse a prefix · 2 selected' span={3}>
          <ObjectBrowser
            prefixes={[
              'datasets/2026-04/',
              'datasets/2026-05/',
              'datasets/archive/',
            ]}
            currentPrefix='datasets/'
            onPrefixChange={() => undefined}
            selectionCount={2}
            toolbar={
              <>
                <Chip tone='ghost'>Download</Chip>
                <Chip tone='ghost'>Share</Chip>
                <Chip tone='ghost'>Delete</Chip>
              </>
            }
          >
            <div
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: 'var(--size-hairline) dashed var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <MetricLabel>Host renders DataTable here</MetricLabel>
            </div>
          </ObjectBrowser>
        </Specimen>
        <Specimen caption='searchSlot + viewModeSlot + footer' span={3}>
          <ObjectBrowser
            prefixes={['models/', 'experiments/']}
            currentPrefix=''
            onPrefixChange={() => undefined}
            searchSlot={
              <SearchInput
                value=''
                onChange={() => undefined}
                placeholder='Filter objects…'
              />
            }
            viewModeSlot={
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <Chip tone='ghost'>≡</Chip>
                <Chip tone='ink'>⊞</Chip>
              </div>
            }
            footer={<Chip tone='ghost'>Load more</Chip>}
          >
            <div
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: 'var(--size-hairline) dashed var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <MetricLabel>DataTable content</MetricLabel>
            </div>
          </ObjectBrowser>
        </Specimen>
        <Specimen caption='loading skeleton' span={2}>
          <ObjectBrowser
            prefixes={[]}
            currentPrefix=''
            onPrefixChange={() => undefined}
            loading
          >
            <div />
          </ObjectBrowser>
        </Specimen>
        <Specimen caption='dragOverlay visible' span={2}>
          <ObjectBrowser
            prefixes={['data/']}
            currentPrefix=''
            onPrefixChange={() => undefined}
            dragOverlay={
              <FileDropzone
                onDrop={() => undefined}
                variant='overlay'
                hint={
                  <span
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 'var(--fw-medium)',
                    }}
                  >
                    Drop files to upload
                  </span>
                }
              />
            }
          >
            <div
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: 'var(--size-hairline) dashed var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <MetricLabel>Drag a file over this area</MetricLabel>
            </div>
          </ObjectBrowser>
        </Specimen>
        <Specimen caption='tree collapsed by default' span={2}>
          <ObjectBrowser
            prefixes={['logs/', 'traces/']}
            currentPrefix=''
            onPrefixChange={() => undefined}
            defaultTreeCollapsed
          >
            <div
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: 'var(--size-hairline) dashed var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <MetricLabel>Collapsed tree</MetricLabel>
            </div>
          </ObjectBrowser>
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Presigned GET</MetricLabel>}>
        ShareLinkDialog
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='before generate · TTL presets' span={2}>
          <ShareLinkDialog
            objectKey='datasets/2026-04/trace-snapshot.json'
            onGenerate={() =>
              Promise.resolve({
                url: 'https://example.com/blob/raw/eyJhbGciOiJIUzI1NiIs...',
                expiresAt: new Date(Date.now() + 3600_000).toISOString(),
              })
            }
          />
        </Specimen>
        <Specimen caption='url · a page link that does not expire' span={2}>
          <ShareLinkDialog
            objectKey='sre-incidents'
            description='23 tasks · 6 models · read-only'
            url='https://cgfs.example.com/dashboard/collections/sre-incidents'
            onClose={() => undefined}
          />
        </Specimen>
        <Specimen caption='url · zh-CN strings' span={2}>
          <LocaleProvider strings={zhCNStrings}>
            <ShareLinkDialog
              objectKey='sre-incidents'
              description='23 道题目 · 6 个模型 · 只读'
              url='https://cgfs.example.com/dashboard/collections/sre-incidents'
              onClose={() => undefined}
            />
          </LocaleProvider>
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Hook</MetricLabel>}>
        useCopyToClipboard
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='copied for 1.5 s after a successful copy'>
          <CopyToClipboardSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>MIME-aware</MetricLabel>}>
        FilePreview
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='image'>
          <FilePreview
            src='https://placehold.co/600x400/png'
            mimeType='image/png'
            name='hero.png'
            maxHeight={200}
            surface={{
              id: 'gallery.filepreview.image',
              kind: 'preview',
              label: 'File preview · hero.png',
              askSuggestions: ['What kind of file is this?'],
              project: (data) => ({
                fields: [
                  { name: 'src', type: 'string', value: data.src },
                  {
                    name: 'mimeType',
                    type: 'string',
                    value: data.mimeType ?? '',
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='binary fallback'>
          <FilePreview
            src='#'
            mimeType='application/octet-stream'
            name='trace-2026-05-12.bin'
            size={4_823_104}
            maxHeight={200}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>codemirror</MetricLabel>}>
        CodeEditor
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='json · editable' span={2}>
          <CodeEditor
            value={'{\n  "service": "aegis-blob",\n  "port": 8085\n}\n'}
            language='json'
            onChange={() => undefined}
            height={160}
            surface={{
              id: 'gallery.editor.json',
              kind: 'editor',
              label: 'Code editor · json',
              askSuggestions: ['Validate this config'],
              project: (data) => ({
                fields: [
                  { name: 'language', type: 'string', value: data.language },
                  {
                    name: 'lines',
                    type: 'number',
                    value: data.value.split('\n').length,
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='yaml · read-only' span={2}>
          <CodeEditor
            value={
              'service: aegis-configcenter\nport: 8087\netcd:\n  endpoints:\n    - localhost:2379\n'
            }
            language='yaml'
            readOnly
            height={160}
          />
        </Specimen>
        <Specimen
          caption='sql · field+table autocomplete · Cmd+Enter submit'
          span={3}
        >
          <SqlCodeEditorSpecimen />
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>react-diff-viewer-continued</MetricLabel>}
      >
        DiffViewer
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen caption='split · json revision' span={3}>
          <DiffViewer
            oldValue={'{\n  "max_qps": 100,\n  "burst": 200\n}'}
            newValue={
              '{\n  "max_qps": 250,\n  "burst": 500,\n  "shadow": true\n}'
            }
            splitView
            leftTitle='revision 41'
            rightTitle='revision 42'
            surface={{
              id: 'gallery.diff.json',
              kind: 'diff',
              label: 'Diff · json revision',
              askSuggestions: ['What changed between revisions?'],
              project: (data) => ({
                fields: [
                  {
                    name: 'oldLines',
                    type: 'number',
                    value: data.oldValue.split('\n').length,
                  },
                  {
                    name: 'newLines',
                    type: 'number',
                    value: data.newValue.split('\n').length,
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='unified · diff-only' span={3}>
          <DiffViewer
            oldValue={
              'service: aegis-blob\nport: 8085\nbuckets:\n  - name: scratch\n    driver: localfs\n'
            }
            newValue={
              'service: aegis-blob\nport: 8085\nbuckets:\n  - name: scratch\n    driver: localfs\n  - name: artifacts\n    driver: s3\n'
            }
            splitView={false}
            showDiffOnly
          />
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>configcenter audit · agent steps</MetricLabel>}
      >
        Timeline
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen
          caption="variant='dot' · mono meta + timestamp · dotColor override"
          span={3}
        >
          <Timeline
            surface={{
              id: 'gallery.timeline.audit',
              kind: 'timeline',
              label: 'Audit log timeline',
              askSuggestions: ['What changed recently?'],
              project: (items) => ({
                entities: items.map((it) => ({
                  id: it.id,
                  type: 'audit-event',
                  label: typeof it.title === 'string' ? it.title : it.id,
                  data: { timestamp: it.timestamp },
                })),
              }),
            }}
            items={[
              {
                id: '1',
                title: 'alice@aegis updated db.dsn',
                description: 'rotated read-replica host',
                timestamp: '2026-05-12 09:14:02',
                meta: 'rev 47',
              },
              {
                id: '2',
                title: 'service-token (gateway) read auth.jwt_audience',
                timestamp: '2026-05-12 08:55:31',
                meta: 'rev 46',
              },
              {
                id: '3',
                title: 'bob@aegis created namespace ratelimit',
                description: 'seeded 4 keys from defaults.toml',
                timestamp: '2026-05-11 18:02:11',
                meta: 'rev 45',
                dotColor: 'var(--accent-success)',
              },
            ]}
          />
        </Specimen>
        <Specimen
          caption="variant='numbered' · mono marker (3ch) · strong title · mono meta · body description · hairline rows · pre-wrap"
          span={3}
        >
          <Timeline
            variant='numbered'
            items={[
              {
                id: 'step-1',
                marker: '01',
                title: 'Call list_pods: {"namespace": "checkout"}',
                meta: '00:04',
                description:
                  'Arguments: namespace=checkout\nObservation: 6 pods, 1 in CrashLoopBackOff',
              },
              {
                id: 'step-2',
                marker: '02',
                title: 'Run SQL: SELECT count(*) FROM orders',
                meta: '00:09',
                description: 'Observation: 18 204 rows',
              },
              {
                id: 'step-42',
                marker: '42',
                title: 'Submit the final answer',
                meta: '01:37',
              },
            ]}
          />
        </Specimen>
        <Specimen
          caption="density='compact' · numbered · default markers · one-line titles, full title on hover"
          span={3}
        >
          <div className='gallery__narrow-panel'>
            <Timeline
              variant='numbered'
              density='compact'
              items={[
                {
                  id: 'c-1',
                  title:
                    'Call run_sql: {"query": "SELECT id, status FROM orders WHERE created_at > now() - interval 1 hour"}',
                },
                {
                  id: 'c-2',
                  title:
                    'Call list_pods: {"namespace": "checkout", "label": "app=checkout-api"}',
                },
                { id: 'c-3', title: 'Submit the final answer' },
              ]}
            />
          </div>
        </Specimen>
        <Specimen caption="density='compact' · dot" span={3}>
          <div className='gallery__narrow-panel'>
            <Timeline
              density='compact'
              items={[
                {
                  id: 'd-1',
                  title:
                    'alice@aegis updated db.dsn and rotated the read-replica host for every region',
                  timestamp: '2026-05-12 09:14:02',
                  meta: 'rev 47',
                },
                {
                  id: 'd-2',
                  title: 'bob@aegis created namespace ratelimit',
                  timestamp: '2026-05-11 18:02:11',
                  meta: 'rev 45',
                },
              ]}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>hyparquet</MetricLabel>}>
        ParquetViewer
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen caption='drop a .parquet to inspect' span={3}>
          <ParquetViewerSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>OTel agent traces</MetricLabel>}>
        TraceTree
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='drag the divider between name + bar; click a row → inspector'
          span={3}
        >
          <TraceTreeSpecimen />
        </Specimen>
        <Specimen
          caption='timed steps · untimed calls draw no bar · inspector detail'
          span={3}
        >
          <TraceTreeMixedTimingSpecimen />
        </Specimen>
        <Specimen caption='no span timed · labels only' span={3}>
          <TraceTree spans={traceTreeUntimedSpans} />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>OTel agent traces</MetricLabel>}>
        TraceSpanInspector
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen caption='Overview · Attributes · Raw tabs' span={3}>
          <TraceSpanInspectorSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Flame / waterfall</MetricLabel>}>
        TimelineChart
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen caption='8-span trace · depth tree' span={3}>
          <TimelineChartDepthSpecimen />
        </Specimen>
        <Specimen caption='500 spans · virtualized · 3 kinds' span={3}>
          <TimelineChartLargeSpecimen />
        </Specimen>
        <Specimen caption='selectable · click logs to console' span={3}>
          <TimelineChartSelectableSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>dagre · xyflow</MetricLabel>}>
        ServiceMap
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen caption='microservice topology · LR · status mix' span={3}>
          <ServiceMapMicroSpecimen />
        </Specimen>
        <Specimen
          caption='AgentM session DAG · TB · root → turns → tools'
          span={3}
        >
          <ServiceMapAgentSpecimen />
        </Specimen>
        <Specimen caption='single-node degenerate case' span={3}>
          <ServiceMapSingleSpecimen />
        </Specimen>
      </div>

      <SectionDivider
        extra={
          <MetricLabel>
            Drag · keyboard · persist · constrain · reset
          </MetricLabel>
        }
      >
        ResizableSidePanel
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='left + right · collapsible · persist · keyboard'
          span={3}
        >
          <ResizableSidePanelSpecimen />
        </Specimen>
        <Specimen
          caption='constrainWidth keeps the centre ≥ 320 px · keyboardStep 24 · Home / End · resetOnDoubleClick'
          span={3}
        >
          <ResizableSidePanelConstrainedSpecimen />
        </Specimen>
        <Specimen
          caption='stackOnMobile · at ≤768 px the parent stacks it full-width above the content, height capped, handle hidden'
          span={3}
        >
          <ResizableSidePanelStackedSpecimen />
        </Specimen>
      </div>
    </Panel>
  );
}
