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
  Chip,
  CodeEditor,
  type CodeEditorField,
  CommitGraph,
  type CommitGraphColumn,
  type CommitGraphCommit,
  type CommitGraphLane,
  Dialog,
  DiffViewer,
  FileDropzone,
  FilePreview,
  FolderDropzone,
  LocaleProvider,
  MetadataList,
  MetricLabel,
  MonoValue,
  ObjectBrowser,
  ObjectInspector,
  type ObjectInspectorTab,
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
  type ServiceMapGroup,
  type ServiceMapNode,
  ShareLinkDialog,
  Timeline,
  TimelineChart,
  Toolbar,
  ToolCallCard,
  type TraceSpan,
  TraceSpanInspector,
  TraceTree,
  UploadQueue,
  useCopyToClipboard,
  useSavedQueries,
  zhCNStrings,
} from '@lincyaw/aegis-ui';

import { TOOL_QUERY_METRICS } from '../fixtures';
import { GalleryRouterLink, Specimen } from '../shared';

/* ── EnvironmentSwitcher specimen ──────────────────────────────────── */

const QUERY_AC_FIELDS: QueryAutocompleteFieldSuggestion[] = [
  { value: 'service.name', hint: 'string' },
  { value: 'service.version', hint: 'string' },
  { value: 'http.status', hint: 'number' },
  { value: 'http.method', hint: 'string' },
  { value: 'duration', hint: 'number (µs)' },
  { value: 'error', hint: 'bool' },
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
  return (
    <div className='gallery__row gallery__row--wide'>
      <Specimen
        caption='empty · type a field name for suggestions · Escape closes; typing, focus or ↓ reopens · a field pick goes on to its values'
        span={2}
      >
        <QueryAutocomplete
          value={empty}
          onChange={setEmpty}
          fieldSuggestions={QUERY_AC_FIELDS}
          valueSuggestions={valueSuggestions}
        />
      </Specimen>
      <Specimen caption='pre-filled' span={2}>
        <QueryAutocomplete
          value={prefilled}
          onChange={setPrefilled}
          fieldSuggestions={QUERY_AC_FIELDS}
          valueSuggestions={valueSuggestions}
        />
      </Specimen>
    </div>
  );
}

const SAVED_QUERY_SEED: SavedQuery[] = [
  {
    id: 'seed-failed',
    name: 'Failed runs · 24h',
    value: 'status:failed AND ts:>now-24h',
    pinned: true,
    lastUsedAt: 3,
  },
  {
    id: 'seed-slow',
    name: 'Slow traces',
    value: 'duration:>1000ms',
    pinned: true,
    lastUsedAt: 2,
  },
  {
    id: 'seed-checkout',
    name: 'Checkout errors',
    value: 'service.name:checkout AND error:true',
    pinned: false,
    lastUsedAt: 1,
  },
];

function SavedQueryBarSpecimen(): ReactNode {
  const stored = useSavedQueries({ namespace: 'gallery.saved-queries' });
  const [storedValue, setStoredValue] = useState('status:queued');
  const [hostQueries, setHostQueries] = useState(SAVED_QUERY_SEED);
  const [hostValue, setHostValue] = useState('service.name:checkout');
  const [lastApplied, setLastApplied] = useState<SavedQuery | null>(null);

  const updateHostQuery = (
    id: string,
    change: (q: SavedQuery) => SavedQuery
  ): void => {
    setHostQueries((prev) => prev.map((q) => (q.id === id ? change(q) : q)));
  };

  return (
    <div className='gallery__row gallery__row--wide'>
      <Specimen caption='useSavedQueries · kept in localStorage' span={2}>
        <SearchInput
          value={storedValue}
          onChange={setStoredValue}
          placeholder='Try a query, then save it…'
        />
        <SavedQueryBar
          queries={stored.queries}
          currentValue={storedValue}
          onApply={(q) => {
            stored.touch(q.id);
            setStoredValue(q.value);
            setLastApplied(q);
          }}
          onSave={stored.save}
          onRename={stored.rename}
          onRemove={stored.remove}
          onTogglePinned={stored.togglePinned}
        />
      </Specimen>
      <Specimen caption='host-held · 2 pinned + 1 unpinned' span={2}>
        <SearchInput
          value={hostValue}
          onChange={setHostValue}
          placeholder='Search…'
        />
        <SavedQueryBar
          queries={hostQueries}
          currentValue={hostValue}
          onApply={(q) => {
            setHostValue(q.value);
            setLastApplied(q);
          }}
          onSave={(name, value) => {
            setHostQueries((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                name,
                value,
                pinned: false,
                lastUsedAt: 0,
              },
            ]);
          }}
          onRename={(id, name) => {
            updateHostQuery(id, (q) => ({ ...q, name }));
          }}
          onRemove={(id) => {
            setHostQueries((prev) => prev.filter((q) => q.id !== id));
          }}
          onTogglePinned={(id) => {
            updateHostQuery(id, (q) => ({ ...q, pinned: !q.pinned }));
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

function ShareLinkInDialogSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AegisButton
        tone='secondary'
        onClick={() => {
          setOpen(true);
        }}
      >
        Share link
      </AegisButton>
      <Dialog
        open={open}
        title='Share link'
        onClose={() => {
          setOpen(false);
        }}
      >
        <ShareLinkDialog
          objectKey='datasets/2026-04/trace-snapshot.json'
          onGenerate={(opts) =>
            Promise.resolve({
              url: 'https://example.com/blob/raw/eyJhbGciOiJIUzI1NiIs...',
              expiresAt: new Date(
                Date.now() + opts.ttlSeconds * 1000
              ).toISOString(),
            })
          }
        />
      </Dialog>
    </>
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

interface InspectorObject {
  key: string;
  size: string;
  contentType: string;
  parquet: boolean;
}

const INSPECTOR_OBJECTS: InspectorObject[] = [
  {
    key: 'datasets/2026-05/trace-snapshot.json',
    size: '4.2 MB',
    contentType: 'application/json',
    parquet: false,
  },
  {
    key: 'datasets/2026-05/spans.parquet',
    size: '18.6 MB',
    contentType: 'application/vnd.apache.parquet',
    parquet: true,
  },
];

const INSPECTOR_PLACEHOLDER_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-13)',
  color: 'var(--text-muted)',
};

function inspectorTabs(object: InspectorObject | null): ObjectInspectorTab[] {
  if (!object) {
    return [];
  }
  return [
    {
      id: 'summary',
      label: 'Summary',
      content: (
        <MetadataList
          entries={[
            { label: 'Key', value: object.key, mono: true, copyable: true },
            { label: 'Size', value: object.size, mono: true },
            { label: 'Content-Type', value: object.contentType, mono: true },
            { label: 'Last modified', value: '2026-05-14 08:21 UTC' },
          ]}
        />
      ),
    },
    {
      id: 'preview',
      label: 'Preview',
      content: (
        <div style={INSPECTOR_PLACEHOLDER_STYLE}>
          Preview placeholder — host renders FilePreview here.
        </div>
      ),
    },
    ...(object.parquet
      ? [
          {
            id: 'parquet',
            label: 'Parquet',
            content: (
              <div style={INSPECTOR_PLACEHOLDER_STYLE}>
                Parquet viewer placeholder — host renders ParquetViewer here.
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'audit-log',
      label: 'Audit log',
      disabled: true,
      hint: 'Audit logging is off for this bucket',
      content: null,
    },
  ];
}

/** Mounted the way the blob browser mounts it: no tabs until an object opens. */
function ObjectInspectorSpecimen(): ReactNode {
  const [object, setObject] = useState<InspectorObject | null>(null);
  return (
    <div className='gallery__row'>
      <Specimen caption='each object opens on its defaultTabId · a picked tab holds until defaultTabId changes · disabled tab with hint'>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}
        >
          {INSPECTOR_OBJECTS.map((o) => (
            <AegisButton key={o.key} onClick={() => setObject(o)}>
              Open {o.key.split('/').pop()}
            </AegisButton>
          ))}
        </div>
        <ObjectInspector
          open={object !== null}
          onClose={() => setObject(null)}
          title={object ? (object.key.split('/').pop() ?? '') : ''}
          subtitle={object?.key}
          defaultTabId={
            object ? (object.parquet ? 'parquet' : 'preview') : undefined
          }
          actions={
            <>
              <Chip tone='ghost'>Download</Chip>
              <Chip tone='ghost'>Copy URL</Chip>
              <Chip tone='ghost'>Share</Chip>
              <Chip tone='warning'>Delete</Chip>
            </>
          }
          tabs={inspectorTabs(object)}
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

/** Children before their parents, as OTel exports rows, and a parent cycle. */
const traceTreeUnorderedSpans: TraceSpan[] = [
  {
    id: 'q-row',
    parentId: 'q',
    name: 'pg.fetch row',
    startMs: 41,
    durationMs: 12,
    status: 'ok',
    kind: 'db',
  },
  {
    id: 'q',
    parentId: 'h',
    name: 'pg.exec SELECT * FROM spans',
    startMs: 30,
    durationMs: 40,
    status: 'ok',
    kind: 'db',
  },
  {
    id: 'h',
    name: 'GET /api/v2/traces',
    startMs: 0,
    durationMs: 120,
    status: 'ok',
    kind: 'http',
  },
  {
    id: 'loop-a',
    parentId: 'loop-b',
    name: 'retry.attempt · parent is retry.backoff',
    startMs: 80,
    durationMs: 22,
    status: 'error',
    kind: 'retry',
  },
  {
    id: 'loop-b',
    parentId: 'loop-a',
    name: 'retry.backoff · parent is retry.attempt',
    startMs: 90,
    durationMs: 0.4,
    kind: 'retry',
  },
];

function TraceTreeUnorderedSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string | undefined>();
  return (
    <TraceTree
      spans={traceTreeUnorderedSpans}
      selectedId={selected}
      onSelect={(span) => setSelected(span.id)}
    />
  );
}

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
  const looped: Record<string, unknown> = { 'retry.count': 3 };
  looped.self = looped;
  const unserialisable: TraceSpan = {
    ...sample,
    id: 'unserialisable',
    name: 'POST /api/v2/retry',
    attrs: { ...sample.attrs, 'retry.state': looped },
  };
  const [open, setOpen] = useState<TraceSpan | null>(null);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      <AegisButton tone='secondary' onClick={() => setOpen(sample)}>
        Open span inspector
      </AegisButton>
      <AegisButton tone='secondary' onClick={() => setOpen(unserialisable)}>
        Open a span with a circular attribute
      </AegisButton>
      <TraceSpanInspector span={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** The same spans TraceTree takes: ms from the start, nesting by parentId. */
const timelineDepthSpans: TraceSpan[] = [
  {
    id: 'root',
    name: 'http.request POST /v1/sessions',
    startMs: 0,
    durationMs: 1800,
    kind: 'http',
    status: 'ok',
  },
  {
    id: 'auth',
    parentId: 'root',
    name: 'auth.verify_jwt',
    startMs: 12,
    durationMs: 84,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'db.session.lookup',
    parentId: 'root',
    name: 'db.session.lookup',
    startMs: 110,
    durationMs: 220,
    kind: 'db',
    status: 'ok',
  },
  {
    id: 'db.session.lookup.query',
    parentId: 'db.session.lookup',
    name: 'pg.exec SELECT * FROM sessions',
    startMs: 130,
    durationMs: 180,
    kind: 'db',
    status: 'ok',
  },
  {
    id: 'llm.call',
    parentId: 'root',
    name: 'llm.call gpt-5',
    startMs: 340,
    durationMs: 1200,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'llm.call.tokenize',
    parentId: 'llm.call',
    name: 'tokenize',
    startMs: 350,
    durationMs: 40,
    kind: 'compute',
    status: 'ok',
  },
  {
    id: 'llm.call.network',
    parentId: 'llm.call',
    name: 'http.fetch openai',
    startMs: 400,
    durationMs: 1130,
    kind: 'http',
    status: 'error',
  },
  {
    id: 'persist',
    parentId: 'root',
    name: 'db.session.update',
    startMs: 1560,
    durationMs: 220,
    kind: 'db',
    status: 'ok',
  },
];

function TimelineChartDepthSpecimen(): ReactNode {
  return <TimelineChart spans={timelineDepthSpans} maxVisibleRows={10} />;
}

function makeLargeTimeline(): TraceSpan[] {
  const kinds = ['http', 'db', 'compute'] as const;
  const spans: TraceSpan[] = [];
  let cursor = 0;
  for (let i = 0; i < 500; i++) {
    const kind = kinds[i % kinds.length] ?? 'compute';
    const base = kind === 'http' ? 30 : kind === 'db' ? 12 : 5;
    const dur = base * (1 + (i % 7) * 0.15);
    spans.push({
      id: `s-${i}`,
      // Every fourth span starts a new root; the next three nest under it.
      parentId: i % 4 === 0 ? null : `s-${i - 1}`,
      name: `${kind}.op[${i}]`,
      startMs: cursor,
      durationMs: dur,
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
      onSelect={(s) => {
        setSelected(s.id);
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

/**
 * A requirement tree against an earlier commit: notes say what changed, a
 * removed requirement stays muted. The selected row's Chip is inverted.
 */
function traceTreeNotedSpans(selected: string | undefined): TraceSpan[] {
  const note = (id: string, text: string, tone?: 'ink'): ReactNode => (
    <Chip size='sm' tone={tone} inverted={id === selected}>
      {text}
    </Chip>
  );
  return [
    { id: 'booking', name: 'booking', kind: 'area' },
    {
      id: 'refund',
      parentId: 'booking',
      name: 'refund',
      kind: 'area',
      note: note('refund', 'changed'),
    },
    {
      id: 'refund-window',
      parentId: 'refund',
      name: 'A ticket is refundable for 14 days after purchase',
      kind: 'requirement',
      note: note('refund-window', 'added', 'ink'),
    },
    {
      id: 'refund-fee',
      parentId: 'refund',
      name: 'A refund keeps a 5 % fee',
      kind: 'requirement',
      muted: true,
      note: note('refund-fee', 'removed'),
      ariaLabel: 'Requirement: A refund keeps a 5 % fee',
    },
    {
      id: 'pay-deadline',
      parentId: 'booking',
      name: 'pay-deadline',
      kind: 'area',
    },
    {
      id: 'pay-test',
      parentId: 'pay-deadline',
      name: 'test_unpaid_booking_is_released',
      kind: 'test',
      status: 'error',
      note: '✕ failed',
    },
    {
      id: 'pay-hold',
      parentId: 'pay-deadline',
      name: 'An unpaid booking is released after 30 minutes',
      kind: 'requirement',
    },
  ];
}

function TraceTreeNotedSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string | undefined>('refund-fee');
  return (
    <TraceTree
      spans={traceTreeNotedSpans(selected)}
      selectedId={selected}
      onSelect={(span) => setSelected(span.id)}
      ariaLabel='Requirements of commit a41f09c against 7c2d1e0'
      wrapName
    />
  );
}

const TRACE_TREE_LINKED_SPANS: TraceSpan[] = [
  { id: 'src', name: 'src', kind: 'directory' },
  { id: 'booking', parentId: 'src', name: 'booking', kind: 'directory' },
  {
    id: 'refund',
    parentId: 'booking',
    name: 'refund.py',
    kind: 'file',
    to: '#src/booking/refund.py',
  },
  {
    id: 'seats',
    parentId: 'booking',
    name: 'seats.py',
    kind: 'file',
    to: '#src/booking/seats.py',
  },
  {
    id: 'tests',
    parentId: 'src',
    name: 'test_refund.py',
    kind: 'file',
    to: '#src/test_refund.py',
  },
];

function TraceTreeLinkedSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string | undefined>('seats');
  return (
    <TraceTree
      spans={TRACE_TREE_LINKED_SPANS}
      selectedId={selected}
      onSelect={(span) => setSelected(span.id)}
      linkComponent={GalleryRouterLink}
      ariaLabel='Files of commit a41f09c'
    />
  );
}

const TASK_GRAPH_AREAS = [
  'seats',
  'refund',
  'pay-deadline',
  'tickets',
  'group-booking-and-seat-allocation',
];
const TASK_GRAPH_MODULES = ['model', 'service', 'api'];

/** A run's task graph: harness → design per area → implement per module → accept per area → accept all. */
function buildTaskGraph(): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  groups: ServiceMapGroup[];
} {
  const failed = 'implement:refund/service';
  const active = 'implement:tickets/api';
  const statusOf = (id: string): ServiceMapNode['status'] =>
    id === failed
      ? 'error'
      : id === active
        ? 'active'
        : id === 'implement:refund/api' || id.startsWith('accept')
          ? 'muted'
          : 'ok';
  const sublabelOf = (id: string): string =>
    id === failed
      ? 'failed · 3 attempts'
      : id === active
        ? 'running'
        : statusOf(id) === 'muted'
          ? 'pending'
          : 'succeeded · cache hit';
  const node = (id: string): ServiceMapNode => ({
    id,
    label: id,
    sublabel: sublabelOf(id),
    status: statusOf(id),
    badge: id === failed ? 3 : undefined,
  });
  const edge = (source: string, target: string): ServiceMapEdge => ({
    id: `${source}→${target}`,
    source,
    target,
    status: target === failed || source === failed ? 'error' : undefined,
  });
  const design = TASK_GRAPH_AREAS.map((area) => `design:${area}`);
  const implement = TASK_GRAPH_AREAS.flatMap((area) =>
    TASK_GRAPH_MODULES.map((module) => `implement:${area}/${module}`)
  );
  const accept = TASK_GRAPH_AREAS.map((area) => `accept:${area}`);
  const ids = ['harness', ...design, ...implement, ...accept, 'accept'];
  const edges = [
    ...design.map((id) => edge('harness', id)),
    ...TASK_GRAPH_AREAS.flatMap((area) =>
      TASK_GRAPH_MODULES.map((module, index) =>
        edge(
          index === 0
            ? `design:${area}`
            : `implement:${area}/${TASK_GRAPH_MODULES[index - 1]}`,
          `implement:${area}/${module}`
        )
      )
    ),
    ...TASK_GRAPH_AREAS.map((area) =>
      edge(`implement:${area}/api`, `accept:${area}`)
    ),
    ...accept.map((id) => edge(id, 'accept')),
  ];
  return {
    nodes: ids.map(node),
    edges,
    groups: [
      { id: 'phase-harness', label: 'HARNESS', nodeIds: ['harness'] },
      { id: 'phase-design', label: 'DESIGN', nodeIds: design },
      { id: 'phase-implement', label: 'IMPLEMENT', nodeIds: implement },
      { id: 'phase-accept', label: 'ACCEPT', nodeIds: [...accept, 'accept'] },
    ],
  };
}

function ServiceMapTaskGraphSpecimen(): ReactNode {
  const { nodes, edges, groups } = useMemo(buildTaskGraph, []);
  const [selected, setSelected] = useState('implement:refund/service');
  return (
    <ServiceMap
      nodes={nodes}
      edges={edges}
      groups={groups}
      fillViewport
      selectedNodeId={selected}
      focusNodeId={selected}
      onNodeClick={(node) => setSelected(node.id)}
      ariaLabel='Task graph of run 7f3a'
    />
  );
}

/** The whole task graph, with the running task's time ticking every 2 s. */
function ServiceMapGroupsSpecimen(): ReactNode {
  const { nodes, edges, groups } = useMemo(buildTaskGraph, []);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((previous) => previous + 2);
    }, 2000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <ServiceMap
      nodes={nodes.map((node) =>
        node.status === 'active'
          ? { ...node, sublabel: `running · ${String(seconds)} s` }
          : node
      )}
      edges={edges}
      groups={groups}
      height={480}
      ariaLabel='Task graph of run 7f3a, all phases'
    />
  );
}

function ServiceMapAutoHeightSpecimen(): ReactNode {
  return (
    <ServiceMap
      nodes={SERVICE_MAP_MICRO_NODES}
      edges={SERVICE_MAP_MICRO_EDGES}
      minimap={false}
      ariaLabel='Service topology'
    />
  );
}

const commitGraphHistory: CommitGraphCommit[] = [
  {
    id: 'a41f09c',
    parents: ['5d7b3e2', '93c0a4f'],
    title: 'Merge pay-deadline into main',
    refs: ['main'],
    meta: 'a41f09c · 2 h ago',
  },
  {
    id: 'e81b6d4',
    parents: ['c2f9a10'],
    title: 'A refund keeps a 5 % fee',
    refs: ['refund'],
    meta: 'e81b6d4 · 3 h ago',
  },
  {
    id: '93c0a4f',
    parents: ['0b4e8c1'],
    title: 'The pay deadline applies to group bookings too',
    meta: '93c0a4f · 5 h ago',
  },
  {
    id: '5d7b3e2',
    parents: ['7c2d1e0'],
    title: 'Rename the tickets area to bookings',
    meta: '5d7b3e2 · 6 h ago',
  },
  {
    id: 'c2f9a10',
    parents: ['7c2d1e0'],
    title: 'Add the refund area: a ticket is refundable for 14 days',
    meta: 'c2f9a10 · 1 d ago',
  },
  {
    id: '0b4e8c1',
    parents: ['7c2d1e0'],
    title: 'An unpaid booking is released after 30 minutes',
    meta: '0b4e8c1 · 1 d ago',
  },
  {
    id: '7c2d1e0',
    parents: ['19ae5f3'],
    title: 'A seat hold expires after 10 minutes',
    meta: '7c2d1e0 · 2 d ago',
  },
  {
    id: '19ae5f3',
    parents: [],
    title: 'Initial requirements',
    meta: '19ae5f3 · 3 d ago',
  },
];

function CommitGraphHistorySpecimen(): ReactNode {
  const [selected, setSelected] = useState(['a41f09c', '7c2d1e0']);
  return (
    <CommitGraph
      commits={commitGraphHistory}
      selectedIds={selected}
      onSelectedIdsChange={setSelected}
      maxSelected={2}
      ariaLabel='Requirement commits'
    />
  );
}

const COMMIT_GRAPH_LANES: CommitGraphLane[] = [
  { id: 'requirements', label: 'requirements' },
  { id: 'runs', label: 'runs' },
  { id: 'trunk', label: 'trunk railway' },
];

/** Requirement commits, the runs built from them, and the trunk commits the runs published. */
const commitGraphVersions: CommitGraphCommit[] = [
  {
    id: 't-4e1',
    lane: 'trunk',
    parents: ['t-b07'],
    title: 'Publish the seats and tickets modules',
    refs: ['railway'],
    links: ['run-7f3a'],
    meta: '4e1c2a9',
  },
  {
    id: 'run-7f3a',
    lane: 'runs',
    parents: ['run-2b91'],
    title: 'Run 7f3a · failed · 1 task',
    links: ['a41f09c'],
    meta: '7f3a0d2',
  },
  {
    id: 'a41f09c',
    lane: 'requirements',
    parents: ['5d7b3e2', '93c0a4f'],
    title: 'Merge pay-deadline into main',
    refs: ['main'],
    meta: 'a41f09c',
  },
  {
    id: '93c0a4f',
    lane: 'requirements',
    parents: ['5d7b3e2'],
    title: 'The pay deadline applies to group bookings too',
    meta: '93c0a4f',
  },
  {
    id: 't-b07',
    lane: 'trunk',
    parents: ['t-61d'],
    title: 'Publish the booking modules',
    links: ['run-2b91'],
    meta: 'b07e4f1',
  },
  {
    id: 'run-2b91',
    lane: 'runs',
    parents: [],
    title: 'Run 2b91 · succeeded',
    links: ['5d7b3e2'],
    meta: '2b9184c',
  },
  {
    id: '5d7b3e2',
    lane: 'requirements',
    parents: ['7c2d1e0'],
    title: 'Rename the tickets area to bookings',
    meta: '5d7b3e2',
  },
  {
    id: 't-61d',
    lane: 'trunk',
    parents: [],
    title: 'Initial trunk',
    meta: '61d0e3b',
  },
  {
    id: '7c2d1e0',
    lane: 'requirements',
    parents: ['19ae5f3'],
    title: 'A seat hold expires after 10 minutes',
    meta: '7c2d1e0',
  },
];

function CommitGraphLanesSpecimen(): ReactNode {
  return (
    <CommitGraph
      commits={commitGraphVersions}
      lanes={COMMIT_GRAPH_LANES}
      ariaLabel='Requirement commits, runs and trunk commits'
    />
  );
}

const COMMIT_TABLE_COLUMNS: CommitGraphColumn[] = [
  { id: 'commit', label: 'commit' },
  { id: 'message', label: 'message', grow: true },
  { id: 'committed', label: 'committed' },
  { id: 'parents', label: 'parents' },
  { id: 'main', label: 'main' },
  { id: 'refund', label: 'refund' },
];

/** Commits on each branch, newest first; the first is the branch's head. */
const COMMIT_TABLE_BRANCHES: Record<string, string[]> = {
  main: ['a41f09c', '93c0a4f', '5d7b3e2', '0b4e8c1', '7c2d1e0', '19ae5f3'],
  refund: ['e81b6d4', 'c2f9a10', '7c2d1e0', '19ae5f3'],
};

const commitGraphTable: CommitGraphCommit[] = commitGraphHistory.map(
  (commit) => ({
    id: commit.id,
    parents: commit.parents,
    cells: {
      commit: (
        <a href={`#${commit.id}`} className='gallery__table-link'>
          {commit.id}
        </a>
      ),
      message: commit.title,
      committed: String(commit.meta).split(' · ')[1],
      parents: commit.parents.map((parent) => (
        <a key={parent} href={`#${parent}`} className='gallery__table-link'>
          {parent}{' '}
        </a>
      )),
      ...Object.fromEntries(
        Object.entries(COMMIT_TABLE_BRANCHES).map(([branch, ids]) => [
          branch,
          ids[0] === commit.id
            ? 'head'
            : ids.includes(commit.id)
              ? 'reachable'
              : '',
        ])
      ),
    },
  })
);

function CommitGraphTableSpecimen(): ReactNode {
  const [selected, setSelected] = useState(['a41f09c', '7c2d1e0']);
  return (
    <CommitGraph
      commits={commitGraphTable}
      columns={COMMIT_TABLE_COLUMNS}
      selectedIds={selected}
      onSelectedIdsChange={setSelected}
      maxSelected={2}
      ariaLabel='Requirement commits'
    />
  );
}

const VERSION_TABLE_TIMES = [
  '09:40',
  '09:32',
  '09:20',
  '08:55',
  '08:10',
  '08:02',
  '07:45',
  '07:30',
  '07:05',
];

const VERSION_TABLE_COLUMNS: CommitGraphColumn[] = [
  { id: 'time', label: 'time' },
  ...COMMIT_GRAPH_LANES.map((lane) => ({
    id: lane.id,
    label: lane.label,
    grow: lane.id === 'requirements',
  })),
];

const versionTable: CommitGraphCommit[] = commitGraphVersions.map(
  (commit, row) => ({
    ...commit,
    cells: {
      time: VERSION_TABLE_TIMES[row],
      [commit.lane ?? 'requirements']: (
        <>
          <a href={`#${commit.id}`} className='gallery__table-link'>
            {String(commit.meta)}
          </a>{' '}
          {commit.title}
        </>
      ),
    },
  })
);

function CommitGraphVersionTableSpecimen(): ReactNode {
  return (
    <CommitGraph
      commits={versionTable}
      lanes={COMMIT_GRAPH_LANES}
      columns={VERSION_TABLE_COLUMNS}
      ariaLabel='Versions'
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
        <Specimen caption='with an UploadQueue below' span={2}>
          <div className='gallery__stack'>
            <FileDropzone onDrop={() => undefined} />
            <UploadQueue
              items={[
                {
                  id: 'a',
                  file: new File([''], 'corpus-2026-04.tar.gz'),
                  status: 'uploading',
                  progress: 0.64,
                },
                {
                  id: 'b',
                  file: new File([''], 'trace-snapshot.json'),
                  status: 'done',
                  progress: 1,
                },
                {
                  id: 'c',
                  file: new File([''], 'too-big.bin'),
                  status: 'error',
                  error: 'exceeds 5 MB cap',
                },
              ]}
            />
          </div>
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
                <div>
                  <MonoValue size='sm' tone='muted'>
                    README.md
                  </MonoValue>{' '}
                  · 2.0 KB
                </div>
                <div>
                  <MonoValue size='sm' tone='muted'>
                    docs/intro.md
                  </MonoValue>{' '}
                  · 512 B
                </div>
                <div>
                  <MonoValue size='sm' tone='muted'>
                    assets/cover.png
                  </MonoValue>{' '}
                  · 128 KB
                </div>
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
                  [new Uint8Array(5 * 1024 * 1024)],
                  'corpus-2026-04.tar.gz'
                ),
                status: 'uploading',
                progress: 0.5,
                bytesUploaded: 2.5 * 1024 * 1024,
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
        <Specimen caption='left only · SearchInput + filter Chip' span={3}>
          <Toolbar
            left={
              <>
                <SearchInput
                  value=''
                  onChange={() => undefined}
                  placeholder='Search…'
                />
                <Chip onClose={() => undefined}>type: image</Chip>
              </>
            }
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

      <SectionDivider extra={<MetricLabel>host-supplied queries</MetricLabel>}>
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
        <Specimen caption='wrap · a requirement with long values' span={1}>
          <MetadataList
            wrap
            entries={[
              { label: 'id', value: 'unpaid-timeout', mono: true },
              {
                label: 'given',
                value: 'o is an unpaid order that p submitted at time t',
              },
              {
                label: 'then',
                value:
                  'o is canceled once 15 minutes have passed since t.\nThe seats o held return to the remaining count of its train.',
              },
              {
                label: 'for_all',
                value: '{\n  "p": "passenger",\n  "o": "order"\n}',
                mono: true,
              },
              {
                label: 'digest',
                value:
                  '9f2c6b1e47a03d58c2b9e0f71a4d6c83b5e29f07d1c4a68e3b70f925d6e1a4c2',
                mono: true,
                copyable: true,
              },
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
        <Specimen
          caption='slow generate (2 s) · change the TTL or download while it runs and the stale link is dropped; the URL names the options it was made for'
          span={2}
        >
          <ShareLinkDialog
            objectKey='datasets/2026-04/trace-snapshot.json'
            onGenerate={(opts) =>
              new Promise((resolve) => {
                window.setTimeout(() => {
                  resolve({
                    url: `https://example.com/blob/raw/trace-snapshot.json?ttl=${String(opts.ttlSeconds)}&download=${String(opts.asAttachment)}`,
                    expiresAt: new Date(
                      Date.now() + opts.ttlSeconds * 1000
                    ).toISOString(),
                  });
                }, 2000);
              })
            }
          />
        </Specimen>
        <Specimen caption='url · a page link that does not expire' span={2}>
          <ShareLinkDialog
            objectKey='sre-incidents'
            description='23 tasks · 6 models · read-only'
            url='https://cgfs.example.com/dashboard/collections/sre-incidents'
          />
        </Specimen>
        <Specimen caption='url · zh-CN strings' span={2}>
          <LocaleProvider strings={zhCNStrings}>
            <ShareLinkDialog
              objectKey='sre-incidents'
              description='23 道题目 · 6 个模型 · 只读'
              url='https://cgfs.example.com/dashboard/collections/sre-incidents'
            />
          </LocaleProvider>
        </Specimen>
        <Specimen
          caption='in a Dialog · the dialog draws the surface and the one close control'
          span={2}
        >
          <ShareLinkInDialogSpecimen />
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
        <Specimen
          caption='children listed before parents nest at their depth · a parent cycle is cut, not dropped · one tab stop: ↑ ↓ move, → expands then enters, ← collapses then leaves, Enter selects'
          span={3}
        >
          <TraceTreeUnorderedSpecimen />
        </Specimen>
        <Specimen
          caption='note · muted · ariaLabel — a requirement tree against an earlier commit: a note at the end of each row says what changed and is its accessible description, a removed requirement stays in muted ink, a failed test notes it · the host passes inverted to the Chip of the selected row · a row is named by its text unless ariaLabel names it · wrapName'
          span={3}
        >
          <TraceTreeNotedSpecimen />
        </Specimen>
        <Specimen
          caption='to · linkComponent — a file name is a link to the file · the row stays the one tab stop: the link takes no focus, Enter on the row follows it, Space selects'
          span={3}
        >
          <TraceTreeLinkedSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>OTel agent traces</MetricLabel>}>
        TraceSpanInspector
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='Overview · Attributes · Raw tabs · an attribute that is not JSON shows why, and Raw says so'
          span={3}
        >
          <TraceSpanInspectorSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Flame / waterfall</MetricLabel>}>
        TimelineChart
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='8-span trace · depth tree · no onSelect, so rows are not buttons · the axis keeps one unit and drops ticks on a narrow track · hover the track for the time under the pointer'
          span={3}
        >
          <TimelineChartDepthSpecimen />
        </Specimen>
        <Specimen caption='500 spans · virtualized · 3 kinds' span={3}>
          <TimelineChartLargeSpecimen />
        </Specimen>
        <Specimen
          caption='onSelect · each row is a button · the selected row is aria-current'
          span={3}
        >
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
        <Specimen
          caption='groups · focusNodeId · active · fillViewport — 27 tasks in four phases, laid out left to right in the order the groups are given; the map opens at actual size on the failed task, fitted to it and its direct neighbours when they fit and centred on the task alone when they do not, with no minimap by default since a focused view runs past every edge; nodes widen with their label and wrap it past 320 px; the running task pulses; click a task to open on it · for assistive technology each task is a group named by its label, each edge a group named source → target, the selected task is aria-current and a phase box is plain text'
          span={3}
        >
          <ServiceMapTaskGraphSpecimen />
        </Specimen>
        <Specimen
          caption='groups · minimap — the whole map fitted; the minimap draws each group as an outline, so the tasks inside it show; the running task ticks every 2 s, and a new status or sublabel keeps your pan and zoom'
          span={3}
        >
          <ServiceMapGroupsSpecimen />
        </Specimen>
        <Specimen
          caption='no height · minimap={false} — fills its container, at least --service-map-min-height tall'
          span={3}
        >
          <ServiceMapAutoHeightSpecimen />
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>parents · merges · lanes</MetricLabel>}
      >
        CommitGraph
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='one history · a merged branch and an open one · refs · onSelectedIdsChange with maxSelected 2 picks two commits to compare · hover a cut-off title to read it whole'
          span={3}
        >
          <CommitGraphHistorySpecimen />
        </Specimen>
        <Specimen
          caption='lanes — requirement commits, the runs built from them and the trunk commits they published, each its own history; dashed links cross lanes · a parent outside the list runs off the bottom'
          span={3}
        >
          <CommitGraphLanesSpecimen />
        </Specimen>
        <Specimen
          caption='columns — a table: the graph in the first column, then one column per entry of columns with the cells of each commit; message grows and is cut off; a branch column marks its head and the commits it reaches · onSelectedIdsChange puts a checkbox in the first column, named by that cell, and a selected row is aria-selected · the graph column is hidden from assistive technology, so the table reads as its named columns'
          span={3}
        >
          <CommitGraphTableSpecimen />
        </Specimen>
        <Specimen
          caption='columns with lanes — a version map: one row per event, its time and its content in the column of its lane; the lanes stay in the graph column'
          span={3}
        >
          <CommitGraphVersionTableSpecimen />
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
