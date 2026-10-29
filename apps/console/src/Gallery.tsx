import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DotChartOutlined,
  DownloadOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  type AegisAction,
  Button as AegisButton,
  type AegisNotification,
  type AegisSearchResult,
  Select as AegisSelect,
  type AgentCommandInvocation,
  type AgentContextValue,
  type AgentMessage,
  AgentPanel,
  AgentProvider,
  Alert,
  AmbientBackground,
  AuthLayout,
  Avatar,
  BlastRadiusBar,
  Breadcrumb,
  BucketCard,
  ButtonLink,
  Carousel,
  type CarouselSlide,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  ChatSessionList,
  Checkbox,
  CheckGrid,
  type CheckGridCell,
  type CheckGridColumn,
  type CheckGridRow,
  Chip,
  CodeBlock,
  CodeEditor,
  type CodeEditorField,
  Collapse,
  ColumnLayout,
  type Command,
  CommandInvocationCard,
  CommandPalette,
  CommandProvider,
  compileLuceneToSql,
  ContentInspectorDialog,
  ContentPreview,
  ControlListItem,
  DangerZone,
  DataList,
  type DataListColumn,
  DataTable,
  type DataTableCellTone,
  type DataTableColumn,
  Dialog,
  DiffViewer,
  DropdownMenu,
  EmptyState,
  EnvironmentSwitcher,
  type EnvironmentSwitcherOption,
  ErrorState,
  EventTable,
  type EventTableColumn,
  type FieldMapping,
  FileDropzone,
  FilePreview,
  FileTree,
  type FileTreeFile,
  FolderDropzone,
  ForgotPasswordForm,
  FormRow,
  IdentityCell,
  InboxPage,
  type InspectableContent,
  type KeyValueItem,
  KeyValueList,
  type LinkComponent,
  LocaleProvider,
  LoginForm,
  Markdown,
  type MarkdownProps,
  MdxDocument,
  mdxTableOfContents,
  MetadataList,
  MetricCard,
  MetricLabel,
  MonoValue,
  NotificationBell,
  type NotificationContextValue,
  NotificationProvider,
  ObjectBrowser,
  ObjectInspector,
  PageHeader,
  PageSizeSelect,
  PageWrapper,
  Pagination,
  Panel,
  PanelTitle,
  ParetoChart,
  type ParetoPoint,
  ParquetViewer,
  PasswordField,
  PickerField,
  ProjectSelector,
  QueryAutocomplete,
  type QueryAutocompleteFieldSuggestion,
  type QueryAutocompleteValueSuggestion,
  RankBar,
  RegisterForm,
  ResizableSidePanel,
  Reveal,
  Tabs as RosettaTabs,
  RunPips,
  type SavedQuery,
  SavedQueryBar,
  ScoreBar,
  SearchInput,
  type SearchProvider,
  SectionDivider,
  ServiceMap,
  type ServiceMapEdge,
  type ServiceMapNode,
  SessionRunOutputView,
  SessionRunTrajectoryView,
  SettingsSection,
  ShareLinkDialog,
  Skeleton,
  SkeletonText,
  SparkLine,
  StackedBar,
  type StackedBarRow,
  type StackedBarSeries,
  StatBlock,
  StatusDot,
  TableOfContents,
  type TableOfContentsItem,
  Terminal,
  type TerminalLine,
  TextField,
  ThemeToggle,
  TimeDisplay,
  Timeline,
  TimelineChart,
  type TimelineSpan,
  TimeRangePicker,
  type TimeRangePickerProps,
  Toolbar,
  ToolCallCard,
  type ToolCallData,
  type TraceSpan,
  TraceSpanInspector,
  TraceTree,
  TrajectoryStep,
  type TrajectoryStepData,
  TrajectoryTimeline,
  UploadQueue,
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
  useCommands,
  useCopyToClipboard,
  useRegisterCommands,
  useTheme,
  zhCNStrings,
} from '@lincyaw/aegis-ui';
import {
  Button,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';

import GalleryDocument, {
  tableOfContents as galleryDocumentToc,
} from './GalleryDocument.mdx';

import './Gallery.css';

/* ── Static specimen data ──────────────────────────────────────────── */

/** The adapter a routed app passes as `linkComponent`: links navigate through the router. */
const GalleryRouterLink: LinkComponent = ({ to, className, children }) => (
  <RouterLink to={to} className={className}>
    {children}
  </RouterLink>
);

const COLOR_TOKEN_GROUPS: Array<{
  label: string;
  tokens: Array<{ name: string; desc: string }>;
}> = [
  {
    label: 'Surface',
    tokens: [
      { name: '--bg-page', desc: 'Page — very light cool grey' },
      { name: '--bg-panel', desc: 'Cards, tables, dialogs' },
      { name: '--bg-muted', desc: 'Table header, segmented track, code' },
      { name: '--bg-tint', desc: 'Cool showcase blocks' },
      { name: '--bg-brand-soft', desc: 'Featured cards, category tags' },
      { name: '--bg-glass', desc: 'Top navigation, floating toolbars' },
      { name: '--bg-glass-strong', desc: 'Dialogs and cards on glass' },
      { name: '--bg-inverted', desc: 'Active / primary — soft near-black' },
      { name: '--bg-backdrop', desc: 'Dialog backdrop, blurred' },
    ],
  },
  {
    label: 'Ink',
    tokens: [
      { name: '--text-main', desc: 'Body and titles' },
      { name: '--text-muted', desc: 'Secondary text, AA on white' },
      { name: '--text-faint', desc: 'Axis ticks, disabled — not for reading' },
      { name: '--text-on-inverted', desc: 'Text on --bg-inverted' },
    ],
  },
  {
    label: 'Border',
    tokens: [
      { name: '--border-hairline', desc: 'Dividers, card strokes' },
      {
        name: '--border-emphasis',
        desc: 'Hover, expanded, secondary controls',
      },
      { name: '--border-glass', desc: 'Inner stroke of glass surfaces' },
    ],
  },
  {
    label: 'Brand & status',
    tokens: [
      { name: '--accent-brand', desc: 'Brand, hero emphasis, focus, nav' },
      { name: '--accent-info', desc: 'Links and clickable text' },
      { name: '--bg-info-soft', desc: 'Info chip, selected row' },
      { name: '--accent-success', desc: 'Passed' },
      { name: '--bg-success-soft', desc: 'Success wash' },
      { name: '--accent-warning', desc: 'Real failures only' },
      { name: '--bg-warning-soft', desc: 'Failure wash' },
      { name: '--ink-warn', desc: 'Caution, not counted' },
      { name: '--bg-warn-soft', desc: 'Caution wash' },
    ],
  },
  {
    label: 'Ambient',
    tokens: [
      { name: '--ambient-1', desc: 'Blue blob centre' },
      { name: '--ambient-2', desc: 'Teal blob centre' },
      { name: '--ambient-3', desc: 'Violet blob centre' },
      { name: '--ambient-hero-1', desc: 'Hero blue blob centre' },
      { name: '--ambient-hero-2', desc: 'Hero teal blob centre' },
      { name: '--ambient-hero-3', desc: 'Hero violet blob centre' },
    ],
  },
];

function TokenSwatch({ name, desc }: { name: string; desc: string }) {
  return (
    <div className='gallery__swatch'>
      <div
        className='gallery__swatch-chip'
        style={{
          background: `var(${name})`,
          outline: 'var(--size-hairline) solid var(--border-hairline)',
        }}
      />
      <div className='gallery__swatch-meta'>
        <MonoValue size='sm' weight='regular'>
          {name}
        </MonoValue>
        <TokenValue name={name} />
        <span className='gallery__swatch-desc'>{desc}</span>
      </div>
    </div>
  );
}

const DATA_COLOR_TOKENS: Array<{ name: string; desc: string }> = [
  { name: '--data-seq', desc: 'Magnitude (score and rank bars)' },
  { name: '--data-cat-1', desc: 'Series 1' },
  { name: '--data-cat-2', desc: 'Series 2' },
  { name: '--data-cat-3', desc: 'Series 3' },
  { name: '--data-cat-4', desc: 'Series 4' },
  { name: '--data-cat-5', desc: 'Series 5' },
  { name: '--data-cat-6', desc: 'Series 6' },
];

const MARKDOWN_DOCUMENT_SAMPLE = `# Injection runbook

Run a fault injection against a staging namespace and collect the traces
the RCA agents read.

## Prepare the target

1. Pick a pedestal that is **healthy** in the cluster view.
2. Confirm the namespace has no injection in flight.

### Configure the fault

| Field    | Example         | Notes                        |
| -------- | --------------- | ---------------------------- |
| Family   | Network chaos   | Partition, delay or loss     |
| Duration | \`300s\`         | Shorter runs miss slow drift |

#### Submit

\`\`\`typescript
await client.injections.create({ family: 'network', durationSec: 300 });
\`\`\`

> Traces land in ClickHouse within a minute of the run finishing.
`;

const GALLERY_DOCUMENT_TOC = mdxTableOfContents(galleryDocumentToc);

function TokenValue({ name }: { name: string }): ReactNode {
  const { resolved } = useTheme();
  const [value, setValue] = useState('');
  useEffect(() => {
    // ThemeProvider writes data-theme in its own effect, which runs after
    // this child's effect; read on the next frame to see the new value.
    const id = requestAnimationFrame(() => {
      setValue(
        getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      );
    });
    return () => cancelAnimationFrame(id);
  }, [name, resolved]);
  return <MetricLabel size='xs'>{value}</MetricLabel>;
}

const TYPE_SAMPLES: Array<{
  family: 'brand' | 'ui' | 'mono';
  label: string;
  sample: string;
  hint: string;
}> = [
  {
    family: 'brand',
    label: 'Brand · Geist',
    sample: 'Resilience under pressure',
    hint: '--font-brand — brand lockups only',
  },
  {
    family: 'ui',
    label: 'UI · Hanken Grotesk + PingFang SC',
    sample: 'GPT 6.1 Sol · 97.6% · 部署回滚后为批量导出审批执行计划',
    hint: '--font-ui / --font-numeric — Latin, numbers and Chinese; digits share one width',
  },
  {
    family: 'mono',
    label: 'Mono · Google Sans Code',
    sample: '13c2dea9bcbb · tests/grading.toml',
    hint: '--font-mono — ids, paths, code and commands; never numbers',
  },
];

interface TypeRole {
  role: string;
  sample: string;
  use: string;
  family?: 'ui' | 'numeric' | 'mono';
}

const APP_TYPE_ROLES: TypeRole[] = [
  {
    role: 'title',
    sample: '部署回滚后为批量导出审批执行计划',
    use: 'Page title',
  },
  {
    role: 'heading',
    sample: '评分标准',
    use: 'Card, chart and section titles',
  },
  {
    role: 'strong',
    sample: 'GPT 6.1 Sol',
    use: 'Primary column, buttons, tabs',
  },
  {
    role: 'body',
    sample: '两个读端的最终计划都由已批准的 binding 控制才通过。',
    use: 'Body text',
  },
  { role: 'small', sample: '只计入当前规则下的运行', use: 'Secondary notes' },
  { role: 'label', sample: '计入运行', use: 'Table headers, field labels' },
  { role: 'micro', sample: '通过', use: 'Small chips, avatar initials' },
  {
    role: 'numeric',
    sample: '97.6%   22.2%   0.00',
    use: 'Numbers in tables, bars and pips',
    family: 'numeric',
  },
  { role: 'number', sample: '40/41', use: 'Metric figures', family: 'numeric' },
  {
    role: 'mono',
    sample: 'rules:9856f0cb · tests/cases/no_dml.py',
    use: 'Ids, paths and code',
    family: 'mono',
  },
];

const ARTICLE_TYPE_ROLES: TypeRole[] = [
  {
    role: 'display',
    sample: '可追溯的运维诊断评测',
    use: 'Overview hero title',
  },
  { role: 'article-title', sample: '我们怎么评分', use: 'Article title' },
  {
    role: 'article-heading',
    sample: '一道题怎样算正确',
    use: 'Article section',
  },
  {
    role: 'article-subheading',
    sample: '代码检查与评委条目',
    use: 'Article subsection, large card title',
  },
  {
    role: 'article-lead',
    sample: '每道题都有一份评分定义，评分器只按它执行。',
    use: 'Article lead',
  },
  {
    role: 'article-body',
    sample:
      '评分项分属结果、安全、诊断三个维度，判定规则写明维度怎样合成结论。',
    use: 'Article body, 720 column',
  },
  {
    role: 'article-caption',
    sample: '图 1 · 评分流程：门槛未通过时，后面的评分项不再检查。',
    use: 'Figure and table captions',
  },
  {
    role: 'eyebrow',
    sample: '评分方法 · 2026-10-28 · 约 5 分钟',
    use: 'Category, date and reading time',
  },
];

const TYPE_ROLE_FAMILY: Record<NonNullable<TypeRole['family']>, string> = {
  ui: 'var(--font-ui)',
  numeric: 'var(--font-numeric)',
  mono: 'var(--font-mono)',
};

function TypeRoleRow({ role, sample, use, family = 'ui' }: TypeRole) {
  const prefix = `--type-${role}`;
  return (
    <div className='gallery__type-row'>
      <MetricLabel as='div' className='gallery__type-label'>
        {`${prefix}-*`}
      </MetricLabel>
      <div
        style={{
          fontFamily: TYPE_ROLE_FAMILY[family],
          fontSize: `var(${prefix}-size)`,
          lineHeight: `var(${prefix}-line)`,
          fontWeight: `var(${prefix}-weight)`,
          letterSpacing: `var(${prefix}-tracking)`,
          fontVariantNumeric: family === 'numeric' ? 'tabular-nums' : 'normal',
        }}
      >
        {sample}
      </div>
      <span className='gallery__type-hint'>
        {use} · <TokenValue name={`${prefix}-size`} /> /{' '}
        <TokenValue name={`${prefix}-line`} /> ·{' '}
        <TokenValue name={`${prefix}-weight`} />
      </span>
    </div>
  );
}

const RADIUS_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--radius-xs', use: 'checkboxes' },
  { name: '--radius-sm', use: 'chip inner corners, check cells' },
  { name: '--radius-md', use: 'inputs, selects, code blocks' },
  { name: '--radius-lg', use: 'cards, panels, dialogs' },
  { name: '--radius-xl', use: 'overview hero, featured cards' },
  { name: '--radius-pill', use: 'buttons, chips, segmented tabs, bars' },
];

const ELEVATION_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--shadow-rest', use: 'cards, panels, selected segment' },
  { name: '--shadow-raised', use: 'hovered clickable cards and rows' },
  { name: '--shadow-overlay', use: 'dialogs, menus, tooltips' },
];

const MOTION_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--motion-fast', use: 'Hover colour, opacity and lift' },
  { name: '--motion-base', use: 'Switching, expanding, segmented slider' },
  { name: '--motion-enter', use: 'Dialog and panel entrance' },
  { name: '--motion-exit', use: 'Dialog and panel exit' },
  { name: '--motion-chart', use: 'Bar draw and number roll' },
  { name: '--motion-stagger-step', use: 'Delay between chart rows' },
  { name: '--motion-lift', use: 'Hover lift of clickable cards and buttons' },
  { name: '--motion-reveal', use: 'Overview and article section reveal' },
  { name: '--motion-reveal-offset', use: 'Reveal rise distance' },
  { name: '--motion-reveal-stagger', use: 'Delay between revealed siblings' },
  { name: '--motion-hero', use: 'Hero text position' },
  { name: '--motion-hero-fade', use: 'Hero text opacity' },
  { name: '--motion-slide', use: 'Hero carousel slide change' },
  { name: '--carousel-dwell', use: 'Time each carousel slide stays' },
  { name: '--motion-ambient', use: 'One loop of the ambient drift' },
];

const AMBIENT_WASH = [
  'radial-gradient(ellipse at 15% 20%, var(--ambient-1), transparent 60%)',
  'radial-gradient(ellipse at 85% 15%, var(--ambient-2), transparent 55%)',
  'radial-gradient(ellipse at 50% 100%, var(--ambient-3), transparent 60%)',
  'var(--bg-page)',
].join(', ');

const GLASS_SURFACE: CSSProperties = {
  border: 'var(--size-hairline) solid var(--border-glass)',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(var(--glass-blur))',
  WebkitBackdropFilter: 'blur(var(--glass-blur))',
  boxShadow: 'var(--shadow-rest)',
};

// Busy content under an overlay, so the blur of the layer on top shows.
function LayeredSurface({ overlay }: { overlay: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: AMBIENT_WASH,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {DATA_COLOR_TOKENS.map((t) => (
          <span
            key={t.name}
            style={{
              width: 'var(--space-8)',
              height: 'var(--space-8)',
              borderRadius: 'var(--radius-circle)',
              background: `var(${t.name})`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 'var(--space-3) var(--space-3) var(--space-3) 40%',
          ...overlay,
        }}
      />
    </div>
  );
}

const SPARK_RISING = [
  42, 41, 44, 43, 47, 50, 49, 52, 55, 58, 62, 60, 64, 68, 71, 73,
];
const SPARK_DIP = [
  80, 78, 79, 81, 77, 70, 62, 51, 43, 38, 35, 41, 50, 58, 64, 67,
];
const SPARK_FLAT = [
  50, 51, 49, 52, 50, 51, 49, 50, 51, 50, 49, 51, 50, 50, 51, 49,
];

const KV_PARAMS: KeyValueItem[] = [
  { k: 'jitter', v: '40 ms' },
  { k: 'latency_cap', v: '200 ms' },
  { k: 'packet_loss', v: '0.02 %' },
  { k: 'threads', v: '128' },
];

const KV_META: KeyValueItem[] = [
  { k: 'Run ID', v: 'EXP-29F1-ALPHA' },
  { k: 'Duration', v: '00:14:22' },
  { k: 'Cluster', v: 'EU-WEST-01' },
  { k: 'Operator', v: 'rosetta@aegis' },
];

const TERMINAL_LINES: TerminalLine[] = [
  {
    ts: '14:22:01',
    prefix: 'AEGIS:',
    body: 'Initializing experiment "playing-the-world".',
  },
  {
    ts: '14:22:05',
    prefix: 'WORKER_ALPHA:',
    body: 'Connection established. Heartbeat 12 ms.',
  },
  {
    ts: '14:23:12',
    prefix: 'INJECTOR:',
    body: 'Executing "Clock Drift" on cluster EU-WEST-01.',
  },
  {
    ts: '14:23:13',
    prefix: 'OBSERVABILITY:',
    body: 'Detecting latency variance (+450 ms).',
  },
  {
    ts: '14:23:18',
    prefix: 'SYSTEM:',
    body: 'Warning. Data consistency thresholds breached in node 04.',
  },
];

/* ── Agent trajectory specimen data ───────────────────────────────── */

const TOOL_QUERY_METRICS: ToolCallData = {
  name: 'query_metrics',
  arguments:
    '{\n  "service": "catalog",\n  "metric": "latency_p99",\n  "window": "5m"\n}',
  result:
    '{\n  "value": 482,\n  "unit": "ms",\n  "baseline": 120,\n  "severity": "critical"\n}',
};

const TOOL_GET_TRACES: ToolCallData = {
  name: 'get_traces',
  arguments:
    '{\n  "service": "catalog",\n  "span_kind": "server",\n  "limit": 10\n}',
  result:
    '{\n  "traces": 10,\n  "avg_duration_ms": 412,\n  "slowest_span": "catalog→redis"\n}',
};

const TOOL_REPORT_RCA: ToolCallData = {
  name: 'report_rca',
  arguments:
    '{\n  "cause": "redis_pool_saturation",\n  "confidence": 0.92,\n  "evidence": [\n    "catalog p99 latency 482ms (4x baseline)",\n    "catalog→redis span latency 380ms (31x baseline)"\n  ]\n}',
  result: '{\n  "status": "reported",\n  "rca_id": "RCA-2024-0510-001"\n}',
};

const TRAJECTORY_STEPS: TrajectoryStepData[] = [
  {
    step: 1,
    timestamp: '14:22:01',
    durationMs: 1240,
    thought:
      'The user is reporting **high latency** in the `catalog` service. I need to first check the current metrics to understand the scope of the issue.\n\n> **Hypothesis**: The latency spike is caused by either:\n> 1. Database connection pool exhaustion\n> 2. Downstream dependency degradation\n> 3. Network partition between services',
    action:
      '`query_metrics(service="catalog", metric="latency_p99", window="5m")`',
    actionType: 'tool_call',
    toolCall: TOOL_QUERY_METRICS,
    observation:
      'p99 latency is **482 ms**, which is **4x** the baseline of `120 ms`. This is a significant anomaly.',
  },
  {
    step: 2,
    timestamp: '14:22:03',
    durationMs: 890,
    thought:
      'Latency spike confirmed. Let me check **error rates** and downstream service health to narrow the root cause.',
    action:
      '`query_metrics(service="catalog", metric="error_rate", window="5m")`',
    actionType: 'tool_call',
    toolCall: {
      name: 'query_metrics',
      arguments:
        '{\n  "service": "catalog",\n  "metric": "error_rate",\n  "window": "5m"\n}',
      result: '{\n  "value": 0.02,\n  "unit": "%",\n  "baseline": 0.01\n}',
    },
    observation:
      'Error rate is slightly elevated (`0.02%` vs baseline `0.01%`) but not the primary issue. Need to trace downstream calls.',
  },
  {
    step: 3,
    timestamp: '14:22:05',
    durationMs: 2100,
    thought:
      'Checking trace data for `catalog` service calls in the last 5 minutes to identify where latency is introduced.\n\n```\nExpected spans:\n- gateway → catalog\n- catalog → redis\n- catalog → postgres\n```',
    action: '`get_traces(service="catalog", span_kind="server", limit=10)`',
    actionType: 'tool_call',
    toolCall: TOOL_GET_TRACES,
    observation:
      'Traces show `catalog→redis` calls averaging **380 ms** (baseline: **12 ms**). Redis connection pool appears saturated.\n\nSee [redis dashboard](/redis) for details.',
  },
  {
    step: 4,
    timestamp: '14:22:08',
    durationMs: 560,
    thought:
      'I have enough evidence. The root cause is **redis connection pool saturation** causing the catalog service latency spike.\n\n**Confidence: 92%**',
    action:
      '`report_rca(cause="redis_pool_saturation", confidence=0.92, evidence=[...])`',
    actionType: 'tool_call',
    toolCall: TOOL_REPORT_RCA,
  },
];

const TRAJECTORY_STEP_SEVERAL_CALLS: TrajectoryStepData = {
  step: 5,
  timestamp: '14:22:09',
  durationMs: 2310,
  summary: 'query_metrics · read_file — two calls in one step',
  thought: 'Compare the **cache** latency with the pool settings in one round.',
  actionType: 'tool_call',
  sections: [
    { label: 'message', text: 'Checking the metric and the config together.' },
    {
      label: 'recorded request body',
      text: '{"model": "claude-opus-4-7",\n "tools": ["query_metrics", "read_file"]}',
      format: 'text',
    },
  ],
  toolCalls: [
    TOOL_QUERY_METRICS,
    {
      name: 'read_file',
      arguments: '{\n  "path": "/etc/redis/pool.conf"\n}',
      status: 'error',
      isError: true,
      result: 'FileNotFoundError: /etc/redis/pool.conf',
    },
  ],
};

const TABLE_DATA = [
  {
    key: 1,
    id: 'INJ-0001',
    type: 'NetworkLatency',
    target: 'order-svc',
    duration: '120 s',
    state: 'running',
  },
  {
    key: 2,
    id: 'INJ-0002',
    type: 'CPUStress',
    target: 'cart-svc',
    duration: '300 s',
    state: 'queued',
  },
  {
    key: 3,
    id: 'INJ-0003',
    type: 'PodKill',
    target: 'inventory',
    duration: '—',
    state: 'failed',
  },
];

const TABLE_COLUMNS = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    render: (v: string) => (
      <MonoValue size='sm' weight='regular'>
        {v}
      </MonoValue>
    ),
  },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Target', dataIndex: 'target', key: 'target' },
  {
    title: 'Duration',
    dataIndex: 'duration',
    key: 'duration',
    render: (v: string) => (
      <MonoValue size='sm' weight='regular'>
        {v}
      </MonoValue>
    ),
  },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    render: (v: string) => {
      const tone =
        v === 'running' ? 'ink' : v === 'failed' ? 'warning' : 'default';
      return <Chip tone={tone}>{v}</Chip>;
    },
  },
];

/* ── Notification specimen data ────────────────────────────────────── */

const NOW = Date.now();
const MOCK_NOTIFS: AegisNotification[] = [
  {
    id: 'g-1',
    title: 'Injection INJ-29F1 completed',
    body: 'kafka loadgen drift finished on EU-WEST-01 with blast radius 42%.',
    timestamp: new Date(NOW - 4 * 60_000).toISOString(),
    read: false,
    category: 'injection.completed',
    severity: 'success',
  },
  {
    id: 'g-2',
    title: 'Dataset build failed',
    body: "Build of 'orders-shadow-v3' failed: 2 of 14 partitions missing schemas.",
    timestamp: new Date(NOW - 35 * 60_000).toISOString(),
    read: false,
    category: 'dataset.build.failed',
    severity: 'error',
  },
  {
    id: 'g-3',
    title: 'Alice invited you to "Payments SRE"',
    body: 'You can now view experiments in the Payments workspace.',
    timestamp: new Date(NOW - 3 * 60 * 60_000).toISOString(),
    read: false,
    category: 'user.invited',
    severity: 'info',
    actor: 'Alice Chen',
  },
  {
    id: 'g-4',
    title: 'API key "ci-runner" expires in 7 days',
    timestamp: new Date(NOW - 8 * 60 * 60_000).toISOString(),
    read: true,
    category: 'api_key.expiring',
    severity: 'warning',
  },
];

const MOCK_NOTIF_VALUE: NotificationContextValue = {
  items: MOCK_NOTIFS,
  unreadCount: MOCK_NOTIFS.filter((n) => !n.read).length,
  loading: false,
};

const MOCK_INVOCATION_PENDING: AgentCommandInvocation = {
  commandId: 'projects.create',
  args: { name: 'rosetta-lab', team: 'platform' },
  status: 'pending',
};

const MOCK_INVOCATION_SUCCESS: AgentCommandInvocation = {
  commandId: 'experiments.run',
  args: { id: 'exp-7421', dryRun: false },
  status: 'success',
};

const MOCK_INVOCATION_ERROR: AgentCommandInvocation = {
  commandId: 'datasets.delete',
  args: { id: 'ds-9911' },
  status: 'error',
  error: 'permission denied: dataset is referenced by 3 experiments',
};

const MOCK_AGENT_MESSAGES: AgentMessage[] = [
  {
    id: 'm-1',
    role: 'user',
    content: 'Spin up a new project called rosetta-lab.',
    timestamp: new Date(NOW - 4 * 60_000).toISOString(),
  },
  {
    id: 'm-2',
    role: 'assistant',
    content:
      'Creating project rosetta-lab under the platform team. I will confirm once it lands.',
    invocations: [MOCK_INVOCATION_SUCCESS],
    timestamp: new Date(NOW - 3 * 60_000).toISOString(),
  },
  {
    id: 'm-3',
    role: 'system',
    content: 'Session resumed from earlier today.',
    timestamp: new Date(NOW - 2 * 60_000).toISOString(),
  },
  {
    id: 'm-4',
    role: 'user',
    content: 'Also kick off the smoke experiment when it is ready.',
    timestamp: new Date(NOW - 60_000).toISOString(),
  },
];

const MOCK_AGENT_VALUE: AgentContextValue = {
  messages: MOCK_AGENT_MESSAGES,
  sending: false,
  send: () => undefined,
};

/* ── Gallery demo actions (Pattern B) ──────────────────────────────── */

const galleryNoop = (label: string) => (): void => {
  console.warn(`[gallery] action invoked: ${label}`);
};

const GALLERY_ACTIONS = {
  themeCycle: {
    id: 'gallery.theme.cycle',
    label: 'Cycle theme',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('theme.cycle'),
  },
  notifOpen: {
    id: 'gallery.notif.open',
    label: 'Open inbox',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('notif.open'),
  },
  controlRun: {
    id: 'gallery.control.run',
    label: 'Run control item',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('control.run'),
  },
  dropdownView: {
    id: 'gallery.dropdown.view-details',
    label: 'View details',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('dropdown.view-details'),
  },
  tabOverview: {
    id: 'gallery.tabs.overview',
    label: 'Overview tab',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('tabs.overview'),
  },
  projectSelect: {
    id: 'gallery.project.select-catalog',
    label: 'Select catalog-service',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('project.select-catalog'),
  },
  envSelectProd: {
    id: 'gallery.env.select-prod',
    label: 'Switch to Production',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('env.select-prod'),
  },
} satisfies Record<string, AegisAction<void, void>>;

/* ── Markdown extension demo ───────────────────────────────────────── */

interface GalleryTreeNode {
  type: string;
  value?: string;
  url?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: GalleryTreeNode[];
}

const GALLERY_WIKI_SCHEME = 'wiki:';

function remarkGalleryWikilinks() {
  const visit = (node: GalleryTreeNode): void => {
    if (!node.children) {
      return;
    }
    node.children = node.children.flatMap((child): GalleryTreeNode[] => {
      if (child.type !== 'text' || !child.value?.includes('[[')) {
        visit(child);
        return [child];
      }
      return child.value
        .split(/(\[\[[^\]]+\]\])/)
        .filter(Boolean)
        .map((part) => {
          const slug = /^\[\[([^\]]+)\]\]$/.exec(part)?.[1];
          return slug
            ? {
                type: 'link',
                url: `${GALLERY_WIKI_SCHEME}${slug}`,
                children: [{ type: 'text', value: slug }],
              }
            : { type: 'text', value: part };
        });
    });
  };
  return visit;
}

function galleryTreeText(node: GalleryTreeNode): string {
  return node.value ?? (node.children ?? []).map(galleryTreeText).join('');
}

function rehypeGalleryHeadingIds() {
  const visit = (node: GalleryTreeNode): void => {
    if (node.type === 'element' && /^h[1-6]$/.test(node.tagName ?? '')) {
      const id = galleryTreeText(node)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      node.properties = { ...node.properties, id };
    }
    node.children?.forEach(visit);
  };
  return visit;
}

function galleryUrlTransform(url: string): string | undefined {
  return /^(wiki:|https?:|#|\/)/.test(url) ? url : undefined;
}

const GALLERY_REMARK_PLUGINS: MarkdownProps['remarkPlugins'] = [
  remarkGalleryWikilinks,
];
const GALLERY_REHYPE_PLUGINS: MarkdownProps['rehypePlugins'] = [
  rehypeGalleryHeadingIds,
];

const GALLERY_MARKDOWN_COMPONENTS: MarkdownProps['components'] = {
  a: ({ href, children }) => {
    if (href === undefined) {
      return <del>{children}</del>;
    }
    if (href.startsWith(GALLERY_WIKI_SCHEME)) {
      return <Chip tone='ink'>{children}</Chip>;
    }
    return <a href={href}>{children}</a>;
  },
  h3: ({ id, children }) => (
    <h3 id={id}>
      {children} <MonoValue size='sm'>#{id}</MonoValue>
    </h3>
  ),
};

const GALLERY_WIKI_MARKDOWN = `### Release notes

Rollout touched [[order-svc]] and [[cart-svc]]; see [the runbook](https://example.com).

[blocked link](javascript:alert(1)) is dropped by \`urlTransform\`.`;

/* ── Helpers ────────────────────────────────────────────────────────── */

interface SpecimenProps {
  caption: string;
  children: ReactNode;
  span?: 1 | 2 | 3;
}

function Specimen({ caption, children, span = 1 }: SpecimenProps) {
  return (
    <div className={`gallery__specimen gallery__specimen--span-${span}`}>
      <div className='gallery__specimen-stage'>{children}</div>
      <MetricLabel as='div' size='xs' className='gallery__specimen-caption'>
        {caption}
      </MetricLabel>
    </div>
  );
}

/* ── Panel, AmbientBackground and Reveal specimens ─────────────────── */

function GlassPanelSpecimen() {
  return (
    <div
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-tint)',
      }}
    >
      <AmbientBackground variant='hero' height='100%' />
      <div className='gallery__row gallery__row--panels'>
        <Panel variant='glass' title='Glass' description="variant='glass'">
          <p className='gallery__panel-body'>
            Frosted over a gradient or image: translucent fill, backdrop blur
            and a light inner edge.
          </p>
        </Panel>
        <Panel
          variant='glass'
          to='#panel-glass'
          title='Glass link'
          description="variant='glass' · to"
        >
          <p className='gallery__panel-body'>
            A hero card that links somewhere lifts like any linked panel.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function AmbientStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        width: '100%',
        height: 'var(--ambient-page-height)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-page)',
      }}
    >
      {children}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: 'var(--space-6)',
        }}
      >
        <PanelTitle size='lg' as='h3'>
          Traceable SRE diagnosis benchmark
        </PanelTitle>
        <Panel title='Content sits above the glow'>
          <p className='gallery__panel-body'>
            The layer paints over the stage background and under its content.
          </p>
        </Panel>
      </div>
    </div>
  );
}

const REVEAL_CARDS: Array<{ title: string; body: string }> = [
  { title: 'Grading method', body: 'How one run is judged correct.' },
  { title: 'Version update', body: 'What changed and which runs it affects.' },
  { title: 'Case study', body: 'One failure traced through its run.' },
];

function RevealSpecimen() {
  const [round, setRound] = useState(0);
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <div>
        <AegisButton tone='secondary' onClick={() => setRound((r) => r + 1)}>
          Replay
        </AegisButton>
      </div>
      <ColumnLayout key={round} columns='1fr 1fr 1fr' gap='md'>
        {REVEAL_CARDS.map((card, index) => (
          <Reveal key={card.title} staggerIndex={index}>
            <Panel title={card.title}>
              <p className='gallery__panel-body'>{card.body}</p>
            </Panel>
          </Reveal>
        ))}
      </ColumnLayout>
    </div>
  );
}

/* ── Button specimens ──────────────────────────────────────────────── */

function ButtonPressedSpecimen() {
  const [failedOnly, setFailedOnly] = useState(true);
  const [unreviewed, setUnreviewed] = useState(false);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      <AegisButton
        tone='secondary'
        aria-pressed={failedOnly}
        onClick={() => setFailedOnly(!failedOnly)}
      >
        Failed only
      </AegisButton>
      <AegisButton
        tone='ghost'
        aria-pressed={unreviewed}
        onClick={() => setUnreviewed(!unreviewed)}
      >
        Unreviewed
      </AegisButton>
    </div>
  );
}

interface ButtonGlassStageProps {
  children: ReactNode;
}

function ButtonGlassStage({ children }: ButtonGlassStageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        background:
          'radial-gradient(circle at 15% 30%, var(--ambient-1), transparent 60%), radial-gradient(circle at 85% 70%, var(--ambient-3), transparent 60%), var(--bg-tint)',
      }}
    >
      {children}
    </div>
  );
}

/* ── Chip and Avatar specimens ─────────────────────────────────────── */

const CHIP_TONES = [
  'default',
  'success',
  'warning',
  'caution',
  'info',
  'ink',
  'ghost',
] as const;

const CHIP_SIZES = ['sm', 'md', 'lg'] as const;

const CHIP_TONE_LABELS: Record<(typeof CHIP_TONES)[number], string> = {
  default: '代码检查',
  success: '通过',
  warning: '未通过',
  caution: '不计入',
  info: '当前版本',
  ink: '已选',
  ghost: '草稿',
};

const AVATAR_SAMPLE_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#3C56F4"/><circle cx="40" cy="32" r="14" fill="#EEF1FE"/><rect x="16" y="52" width="48" height="40" rx="20" fill="#EEF1FE"/></svg>'
)}`;

function ChipToggleSpecimen() {
  const [selected, setSelected] = useState(false);
  return (
    <Chip
      tone={selected ? 'ink' : 'default'}
      size='md'
      onClick={() => {
        setSelected((value) => !value);
      }}
    >
      安全
    </Chip>
  );
}

interface TimeRangePickerSpecimenProps {
  initial: string;
  presets?: TimeRangePickerProps['presets'];
  logToConsole?: boolean;
}

function TimeRangePickerSpecimen({
  initial,
  presets,
  logToConsole = false,
}: TimeRangePickerSpecimenProps) {
  const [value, setValue] = useState(initial);
  return (
    <TimeRangePicker
      value={value}
      presets={presets}
      onChange={(next) => {
        setValue(next);
        if (logToConsole) {
          console.warn('TimeRangePicker change:', next);
        }
      }}
    />
  );
}

/* ── App ────────────────────────────────────────────────────────────── */

function App() {
  const [active, setActive] = useState<string>('item-2');
  const [modalOpen, setModalOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <div className='gallery'>
      <header className='gallery__header'>
        <div>
          <PanelTitle size='hero' as='h1'>
            Aegis Rosetta
          </PanelTitle>
          <MetricLabel as='div' className='gallery__header-tag'>
            UI System Specimen · v0
          </MetricLabel>
        </div>
        <p className='gallery__intro'>
          Cool, very light surfaces and soft near-black ink, one brand blue,
          glass layered over a faint ambient wash, pill controls. Hanken Grotesk
          sets text and numbers; Google Sans Code sets ids, paths and code.
          Activation is surface inversion; anomaly red marks real failures only.
        </p>
      </header>

      {/* ── Color tokens ───────────────────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Color &amp; surface tokens</PanelTitle>}
      >
        {COLOR_TOKEN_GROUPS.map((g) => (
          <div key={g.label} className='gallery__stack'>
            <SectionDivider>{g.label}</SectionDivider>
            <div className='gallery__swatches'>
              {g.tokens.map((t) => (
                <TokenSwatch key={t.name} name={t.name} desc={t.desc} />
              ))}
            </div>
          </div>
        ))}

        <SectionDivider>Data-viz colours</SectionDivider>
        <div className='gallery__swatches'>
          {DATA_COLOR_TOKENS.map((t) => (
            <TokenSwatch key={t.name} name={t.name} desc={t.desc} />
          ))}
        </div>

        <SectionDivider>Ambient wash</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='--ambient-1 · --ambient-2 · --ambient-3 radial blobs on --bg-page'
            span={3}
          >
            <div
              style={{
                width: '100%',
                height: 'var(--space-12)',
                borderRadius: 'var(--radius-lg)',
                background: AMBIENT_WASH,
              }}
            />
          </Specimen>
        </div>
      </Panel>

      {/* ── Typography ─────────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Typography</PanelTitle>}>
        <div className='gallery__type-list'>
          {TYPE_SAMPLES.map((s) => (
            <div className='gallery__type-row' key={s.label}>
              <MetricLabel as='div' className='gallery__type-label'>
                {s.label}
              </MetricLabel>
              <div
                className={`gallery__type-sample gallery__type-sample--${s.family}`}
              >
                {s.sample}
              </div>
              <span className='gallery__type-hint'>{s.hint}</span>
            </div>
          ))}
        </div>

        <SectionDivider>Type roles · app pages</SectionDivider>
        <div className='gallery__type-list'>
          {APP_TYPE_ROLES.map((r) => (
            <TypeRoleRow key={r.role} {...r} />
          ))}
        </div>

        <SectionDivider>Type roles · overview and article</SectionDivider>
        <div className='gallery__type-list'>
          {ARTICLE_TYPE_ROLES.map((r) => (
            <TypeRoleRow key={r.role} {...r} />
          ))}
        </div>

        <SectionDivider>PanelTitle scale</SectionDivider>
        <div className='gallery__stack'>
          <PanelTitle size='hero' as='h2'>
            Hero · Display 56
          </PanelTitle>
          <PanelTitle size='lg' as='h3'>
            Large · Title 28
          </PanelTitle>
          <PanelTitle size='base'>Base · Heading 16</PanelTitle>
          <PanelTitle size='sm'>Small · Strong 13</PanelTitle>
        </div>

        <SectionDivider>MonoValue scale</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='sm · regular'>
            <MonoValue size='sm' weight='regular'>
              0.142
            </MonoValue>
          </Specimen>
          <Specimen caption='sm · medium'>
            <MonoValue size='sm'>0.142</MonoValue>
          </Specimen>
          <Specimen caption='base · medium'>
            <MonoValue
              size='base'
              surface={{
                id: 'gallery.mono.value',
                kind: 'value',
                label: 'Demo numeric value',
                askSuggestions: ['What does this number mean?'],
                project: (children) => ({
                  fields: [
                    { name: 'value', type: 'number', value: String(children) },
                  ],
                }),
              }}
            >
              0.142
            </MonoValue>
          </Specimen>
          <Specimen caption='lg · medium'>
            <MonoValue size='lg'>0.142</MonoValue>
          </Specimen>
          <Specimen caption="tone='success'">
            <MonoValue tone='success'>12</MonoValue>
          </Specimen>
          <Specimen caption="tone='danger'">
            <MonoValue tone='danger'>3</MonoValue>
          </Specimen>
          <Specimen caption="tone='muted'">
            <MonoValue tone='muted'>0</MonoValue>
          </Specimen>
        </div>

        <SectionDivider>MetricLabel</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption="size='sm' (default) · small role">
            <MetricLabel>Last updated 2h ago</MetricLabel>
          </Specimen>
          <Specimen caption="size='sm' · CJK">
            <MetricLabel>只计入当前规则下的运行</MetricLabel>
          </Specimen>
          <Specimen caption="size='xs' · micro role">
            <MetricLabel size='xs'>2h ago</MetricLabel>
          </Specimen>
          <Specimen caption='inverted'>
            <div className='gallery__inverted-host'>
              <MetricLabel inverted>Active</MetricLabel>
            </div>
          </Specimen>
          <Specimen caption="as='div'">
            <MetricLabel as='div'>Block label</MetricLabel>
          </Specimen>
        </div>

        <SectionDivider>Markdown</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='inline + block · fences render as CodeBlock'
            span={2}
          >
            <Markdown>
              {`### Quick **markdown** sample\n\n- Lists work\n- Inline \`code\` and [links](https://example.com)\n\n\`\`\`bash\nkubectl get pods -n aegis\n\`\`\`\n\n> Blockquotes too.`}
            </Markdown>
          </Specimen>
          <Specimen
            caption='remarkPlugins · rehypePlugins · components · urlTransform'
            span={2}
          >
            <Markdown
              remarkPlugins={GALLERY_REMARK_PLUGINS}
              rehypePlugins={GALLERY_REHYPE_PLUGINS}
              components={GALLERY_MARKDOWN_COMPONENTS}
              urlTransform={galleryUrlTransform}
            >
              {GALLERY_WIKI_MARKDOWN}
            </Markdown>
          </Specimen>
          <Specimen caption="variant='document' · heading scale" span={3}>
            <Markdown variant='document'>{MARKDOWN_DOCUMENT_SAMPLE}</Markdown>
          </Specimen>
        </div>

        <SectionDivider>MdxDocument</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='an .mdx module compiled by aegisMdx() · article type roles · fences render as CodeBlock · /… links through linkComponent · imported components and components={…} in the flow keep their own styles · mdxTableOfContents beside it'
            span={3}
          >
            <div className='gallery__toc-demo'>
              <TableOfContents items={GALLERY_DOCUMENT_TOC} />
              <MdxDocument
                content={GalleryDocument}
                components={GALLERY_DOCUMENT_COMPONENTS}
                linkComponent={GalleryRouterLink}
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>SectionDivider</SectionDivider>
        <div className='gallery__stack'>
          <SectionDivider>Plain label</SectionDivider>
          <SectionDivider extra={<MetricLabel>Extra slot</MetricLabel>}>
            With extra
          </SectionDivider>
          <SectionDivider rule={false}>No rule (rule=false)</SectionDivider>
        </div>

        <SectionDivider>ThemeToggle</SectionDivider>
        <div className='gallery__row'>
          {/* right-click any surface/action below (or Cmd/Ctrl+`.`) to open the AskOverlay */}
          <Specimen caption='one-click cycler · light → dark → system'>
            <ThemeToggle action={GALLERY_ACTIONS.themeCycle} />
          </Specimen>
        </div>
      </Panel>

      {/* ── Shape, elevation & motion ──────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Shape, elevation &amp; motion</PanelTitle>}
      >
        <SectionDivider>Radius</SectionDivider>
        <div className='gallery__row'>
          {RADIUS_TOKENS.map((t) => (
            <Specimen key={t.name} caption={`${t.name} · ${t.use}`}>
              <div
                style={{
                  width: '100%',
                  height: 'var(--space-12)',
                  borderRadius: `var(${t.name})`,
                  background: 'var(--bg-panel)',
                  border: 'var(--size-hairline) solid var(--border-emphasis)',
                }}
              />
            </Specimen>
          ))}
        </div>

        <SectionDivider>Elevation</SectionDivider>
        <div className='gallery__row'>
          {ELEVATION_TOKENS.map((t) => (
            <Specimen key={t.name} caption={`${t.name} · ${t.use}`}>
              <div
                style={{
                  flex: '1 1 auto',
                  height: 'var(--space-12)',
                  margin: 'var(--space-3)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-panel)',
                  border: 'var(--size-hairline) solid var(--border-hairline)',
                  boxShadow: `var(${t.name})`,
                }}
              />
            </Specimen>
          ))}
        </div>

        <SectionDivider>Glass &amp; backdrop</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='glass · --bg-glass + blur(--glass-blur) + --border-glass + --shadow-rest'
            span={2}
          >
            <LayeredSurface
              overlay={{ ...GLASS_SURFACE, background: 'var(--bg-glass)' }}
            />
          </Specimen>
          <Specimen caption='glass strong · --bg-glass-strong' span={2}>
            <LayeredSurface
              overlay={{
                ...GLASS_SURFACE,
                background: 'var(--bg-glass-strong)',
              }}
            />
          </Specimen>
          <Specimen
            caption='dialog backdrop · --bg-backdrop + blur(--backdrop-blur)'
            span={2}
          >
            <LayeredSurface
              overlay={{
                inset: 0,
                background: 'var(--bg-backdrop)',
                backdropFilter: 'blur(var(--backdrop-blur))',
                WebkitBackdropFilter: 'blur(var(--backdrop-blur))',
              }}
            />
          </Specimen>
        </div>

        <SectionDivider>Focus</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='ring · --focus-ring-width solid --focus-ring-color, offset --focus-ring-offset'>
            <span
              style={{
                display: 'inline-block',
                padding: 'var(--space-1) var(--space-4)',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-inverted)',
                color: 'var(--text-on-inverted)',
                outline:
                  'var(--focus-ring-width) solid var(--focus-ring-color)',
                outlineOffset: 'var(--focus-ring-offset)',
              }}
            >
              按钮
            </span>
          </Specimen>
          <Specimen caption='field · --accent-brand border + --focus-halo'>
            <span
              style={{
                display: 'block',
                width: '100%',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-panel)',
                border: 'var(--size-hairline) solid var(--accent-brand)',
                boxShadow: 'var(--focus-halo)',
                color: 'var(--text-muted)',
              }}
            >
              搜索
            </span>
          </Specimen>
        </div>

        <SectionDivider>Motion</SectionDivider>
        <div className='gallery__stack'>
          {MOTION_TOKENS.map((t) => (
            <div
              key={t.name}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: 'var(--space-2)',
              }}
            >
              <MonoValue size='sm' weight='regular'>
                {t.name}
              </MonoValue>
              <TokenValue name={t.name} />
              <span className='gallery__type-hint'>{t.use}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Surface (Panel) ────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Surface — Panel</PanelTitle>}>
        <SectionDivider>Panel</SectionDivider>
        <div className='gallery__row gallery__row--panels'>
          <Panel
            title='Default panel'
            description='Mean result score · higher is better'
            extra={<MetricLabel>Label</MetricLabel>}
            surface={{
              id: 'gallery.panel.basic',
              kind: 'panel',
              label: 'Default panel',
              askSuggestions: ['What is this panel?', 'Summarize this panel'],
              project: () => ({
                fields: [
                  {
                    name: 'shape',
                    type: 'string',
                    value: 'hairline border, 20px radius, resting shadow',
                  },
                ],
              }),
            }}
          >
            <p className='gallery__panel-body'>
              Hairline border, 20 px radius, resting shadow. The title accepts a
              string or a rich node; the description carries the metric and its
              direction.
            </p>
          </Panel>

          <Panel padded={false} title='Unpadded'>
            <div className='gallery__panel-no-pad'>
              padded=false — the host owns the layout, e.g. a table.
            </div>
          </Panel>

          <Panel
            elevation='raised'
            title='Raised'
            description="elevation='raised'"
          >
            <p className='gallery__panel-body'>
              Featured content and hero cards sit one step above the resting
              cards.
            </p>
          </Panel>
        </div>

        <SectionDivider extra={<MetricLabel>Variant</MetricLabel>}>
          Panel · variants
        </SectionDivider>
        <div className='gallery__row gallery__row--panels'>
          <Panel variant='tint' title='Tint' description="variant='tint'">
            <p className='gallery__panel-body'>
              Showcase blocks on overview and article pages.
            </p>
          </Panel>

          <Panel variant='brand' title='Brand' description="variant='brand'">
            <p className='gallery__panel-body'>
              Featured content and pinned articles.
            </p>
          </Panel>
        </div>
        <GlassPanelSpecimen />

        <SectionDivider
          extra={<MetricLabel>Hover · keyboard focus</MetricLabel>}
        >
          Panel · link
        </SectionDivider>
        <div className='gallery__row gallery__row--panels'>
          <Panel
            to='#panel-link'
            title='How we grade'
            description='Methods · about 5 min'
            extra={<AegisButton tone='ghost'>Save</AegisButton>}
          >
            <p className='gallery__panel-body'>
              The whole card links to the title&apos;s destination and lifts on
              hover; the button in extra stays its own target.
            </p>
          </Panel>

          <Panel
            to='#panel-link'
            variant='brand'
            elevation='raised'
            title='Version update'
            description='Featured · raised'
          >
            <p className='gallery__panel-body'>
              A featured card starts raised and still lifts on hover.
            </p>
          </Panel>

          <Panel
            to='#panel-router-link'
            linkComponent={GalleryRouterLink}
            title='Case analysis'
            description='linkComponent · react-router Link'
          >
            <p className='gallery__panel-body'>
              A routed app passes its Link adapter, so the card navigates
              through the router instead of reloading the page.
            </p>
          </Panel>
        </div>

        <SectionDivider>AmbientBackground</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption="variant='page' · default height --ambient-page-height"
            span={3}
          >
            <AmbientStage>
              <AmbientBackground />
            </AmbientStage>
          </Specimen>
          <Specimen
            caption="variant='hero' · height overridden (default --ambient-hero-height)"
            span={3}
          >
            <AmbientStage>
              <AmbientBackground
                variant='hero'
                height='var(--ambient-page-height)'
              />
            </AmbientStage>
          </Specimen>
        </div>

        <SectionDivider
          extra={<MetricLabel>Plays once on entering the viewport</MetricLabel>}
        >
          Reveal
        </SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='staggerIndex 0 · 1 · 2 · Replay remounts' span={3}>
            <RevealSpecimen />
          </Specimen>
        </div>
      </Panel>

      {/* ── Indicators ─────────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Indicators</PanelTitle>}>
        <SectionDivider>StatusDot</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='ink'>
            <StatusDot />
          </Specimen>
          <Specimen caption='ink · pulse'>
            <StatusDot pulse />
          </Specimen>
          <Specimen caption='warning'>
            <StatusDot tone='warning' />
          </Specimen>
          <Specimen caption='warning · pulse'>
            <StatusDot tone='warning' pulse />
          </Specimen>
          <Specimen caption='size 10'>
            <StatusDot size={10} />
          </Specimen>
          <Specimen caption='success'>
            <StatusDot tone='success' />
          </Specimen>
        </div>

        <SectionDivider>Chip</SectionDivider>
        {CHIP_SIZES.map((size) => (
          <div className='gallery__row' key={size}>
            {CHIP_TONES.map((tone) => (
              <Specimen key={tone} caption={`${tone} · ${size}`}>
                <Chip tone={tone} size={size}>
                  {CHIP_TONE_LABELS[tone]}
                </Chip>
              </Specimen>
            ))}
          </div>
        ))}
        <div className='gallery__row'>
          <Specimen caption='leading dot'>
            <Chip size='md' leading={<StatusDot pulse size={6} />}>
              运行中
            </Chip>
          </Specimen>
          <Specimen caption='leading icon'>
            <Chip tone='success' size='md' leading={<CheckCircleOutlined />}>
              通过
            </Chip>
          </Specimen>
          <Specimen caption='removable · onClose'>
            <Chip
              size='md'
              onClose={() => {
                /* no-op */
              }}
            >
              安全
            </Chip>
          </Specimen>
          <Specimen caption='clickable · ink when selected'>
            <ChipToggleSpecimen />
          </Specimen>
          <Specimen caption='agent surface'>
            <Chip
              tone='ink'
              surface={{
                id: 'gallery.chip.running',
                kind: 'tag',
                label: 'Status chip · running',
                askSuggestions: ['What does this status mean?'],
                project: (children) => ({
                  fields: [
                    { name: 'status', type: 'string', value: String(children) },
                  ],
                }),
              }}
            >
              running
            </Chip>
          </Specimen>
        </div>

        <SectionDivider>Alert</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='info'>
            <Alert tone='info'>这条记录不在当前筛选条件中。</Alert>
          </Specimen>
          <Specimen caption='warning'>
            <Alert tone='warning'>3 个案例缺少完整的版本或测量记录。</Alert>
          </Specimen>
          <Specimen caption='error'>
            <Alert tone='error'>无法读取标签建议。</Alert>
          </Specimen>
          <Specimen caption='success'>
            <Alert tone='success'>所有检查均已通过。</Alert>
          </Specimen>
        </div>
        <div className='gallery__row'>
          <Specimen caption="title · tone='error'" span={3}>
            <Alert tone='error' title='The run failed the plan check'>
              Plan check failed; exported results intact; safety check passed.
            </Alert>
          </Specimen>
          <Specimen caption="title · tone='success'" span={3}>
            <Alert tone='success' title='Both readers passed every check'>
              Plan check passed; exported results intact; safety check passed.
            </Alert>
          </Specimen>
        </div>
        <div className='gallery__row'>
          <Specimen caption="icon · title · tone='success'" span={3}>
            <Alert
              tone='success'
              icon={<CheckCircleOutlined />}
              title='Passed 11 of 11 checks'
            >
              Outcome restored; no destructive statement ran.
            </Alert>
          </Specimen>
          <Specimen caption="icon · tone='error'" span={3}>
            <Alert tone='error' icon={<CloseCircleOutlined />}>
              The run failed the plan check.
            </Alert>
          </Specimen>
        </div>

        <SectionDivider>Collapse</SectionDivider>
        <div className='gallery__stack'>
          <Collapse
            defaultActiveKeys={['first']}
            items={[
              {
                key: 'first',
                label: '完整理由与评分要求',
                children: '展开后的内容。',
              },
              {
                key: 'second',
                label: '评分干预检查',
                children: '未展开的内容。',
              },
            ]}
          />
        </div>

        <SectionDivider>Pagination</SectionDivider>
        <div className='gallery__stack'>
          <Pagination
            page={2}
            pageSize={10}
            total={137}
            unit='个步骤'
            pageSizeOptions={[1, 5, 10, 25]}
            onChange={() => {
              /* no-op */
            }}
          />
        </div>

        <SectionDivider>Checkbox</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='unchecked'>
            <Checkbox
              checked={false}
              label='选择题目'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='checked'>
            <Checkbox
              checked
              label='选择题目'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='indeterminate'>
            <Checkbox
              checked={false}
              indeterminate
              label='选择题目'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='no label · ariaLabel (row selector)'>
            <Checkbox
              checked={false}
              ariaLabel='选择本行'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='disabled'>
            <Checkbox
              checked={false}
              disabled
              label='选择题目'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='disabled · checked'>
            <Checkbox
              checked
              disabled
              label='选择题目'
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
        </div>

        <SectionDivider>Select</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='label · value'>
            <AegisSelect
              label='标签'
              value='first'
              options={GALLERY_SELECT_OPTIONS}
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='allowClear · pick, then clear to the placeholder'>
            <SelectSpecimen />
          </Specimen>
          <Specimen caption='placeholder · --text-muted'>
            <AegisSelect
              value=''
              placeholder='选择横轴指标'
              options={[{ value: 'score', label: '结果均分' }]}
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
          <Specimen caption='long value · ellipsis in a 192 column'>
            <div style={{ width: 192 }}>
              <AegisSelect
                label='比较指标'
                value='long'
                options={[
                  {
                    value: 'long',
                    label: '诊断维度的加权均分（只计入当前规则）',
                  },
                ]}
                onChange={() => {
                  /* no-op */
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='disabled'>
            <AegisSelect
              value='v1'
              disabled
              options={[{ value: 'v1', label: 'V1 · 当前版本' }]}
              onChange={() => {
                /* no-op */
              }}
            />
          </Specimen>
        </div>

        <SectionDivider>PickerField</SectionDivider>
        <PickerFieldSpecimen />

        <SectionDivider>RankBar</SectionDivider>
        <div className='gallery__stack'>
          <RankBar
            direction='越高越好'
            items={[
              { key: 'gpt', label: 'GPT 6.1 Sol', value: 1 },
              { key: 'glm', label: 'GLM 5.3 Flash', value: 0.2 },
              { key: 'ds', label: 'DeepSeek Flash', value: 0 },
            ]}
            onSelect={() => {
              /* no-op */
            }}
          />
          <RankBarSpecimen />
        </div>

        <SectionDivider>ScoreBar</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='value · two decimals'>
            <ScoreBar value={0.72} />
          </Specimen>
          <Specimen caption='0.2583 → 0.26'>
            <ScoreBar value={0.2583} />
          </Specimen>
          <Specimen caption='zero · 0.00 keeps a 2 px endpoint'>
            <ScoreBar value={0} />
          </Specimen>
          <Specimen caption='empty · null → em dash, empty track'>
            <ScoreBar value={null} />
          </Specimen>
          <Specimen caption='max · format · ariaLabel'>
            <ScoreBar
              value={7}
              max={10}
              format={(value) => value.toFixed(0)}
              ariaLabel='7 of 10 checks'
            />
          </Specimen>
          <Specimen
            caption='numeric DataTable column · fills draw in staggered by staggerIndex'
            span={3}
          >
            <DataTable
              columns={[
                GALLERY_MODEL_COLUMNS[0],
                {
                  key: 'score',
                  header: 'Mean score',
                  numeric: true,
                  render: (row, index) => (
                    <ScoreBar value={row.mean} staggerIndex={index} />
                  ),
                },
              ]}
              data={GALLERY_MODEL_ROWS}
              rowKey={(row) => row.model}
            />
          </Specimen>
        </div>

        <SectionDivider>RunPips</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='dots · passed · failed · execution failed'>
            <RunPips counts={{ passed: 3, failed: 1, errored: 1 }} />
          </Specimen>
          <Specimen caption='every dot kind · passed · failed · errored · pending'>
            <RunPips
              counts={{ passed: 1, failed: 1, errored: 1, pending: 1 }}
            />
          </Specimen>
          <Specimen caption='10 runs · still dots'>
            <RunPips
              counts={{ passed: 6, failed: 2, errored: 1, pending: 1 }}
            />
          </Specimen>
          <Specimen caption='bar · above 10 runs, 64 px proportional'>
            <RunPips counts={{ passed: 12, failed: 6, errored: 2 }} />
          </Specimen>
          <Specimen caption='bar · 120 runs'>
            <RunPips counts={{ passed: 31, failed: 80, errored: 9 }} />
          </Specimen>
          <Specimen caption='maxDots={4}'>
            <RunPips
              counts={{ passed: 3, failed: 2, errored: 0 }}
              maxDots={4}
            />
          </Specimen>
          <Specimen caption='no runs'>
            <RunPips counts={{ passed: 0, failed: 0, errored: 0 }} />
          </Specimen>
        </div>

        <SectionDivider>ParetoChart</SectionDivider>
        <div className='gallery__stack'>
          <ParetoChartSpecimen />
          <ParetoChart
            xLabel='平均耗时（秒）'
            yLabel='结果均分'
            points={[
              { key: 'gpt', label: 'GPT 6.1 Sol', x: 180, y: 1 },
              { key: 'glm', label: 'GLM 5.3 Flash', x: 60, y: 0.2 },
              { key: 'ds', label: 'DeepSeek Flash', x: 40, y: 0 },
            ]}
            onSelect={() => {
              /* no-op */
            }}
          />
          <ParetoChart
            xLabel='横轴指标'
            yLabel='纵轴指标'
            points={[]}
            emptyDescription='配置两个指标及优化方向后，显示模型点和帕累托前沿。'
          />
          <Specimen
            caption='empty · a slot in place of the plot, at its minimum height'
            span={3}
          >
            <ParetoChart
              xLabel='X metric'
              yLabel='Mean result score'
              points={[]}
              empty={
                <EmptyState
                  icon={<DotChartOutlined aria-hidden />}
                  title='Choose both axes'
                  description='Pick an X metric to place every model by both metrics.'
                />
              }
            />
          </Specimen>
        </div>

        <SectionDivider>CheckGrid</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='rows = checks, columns = runs · passed · missed writes the miss · unchecked em dash · caption'
            span={3}
          >
            <CheckGrid
              rowHeader='检查'
              passedLabel='通过'
              uncheckedLabel='未检查'
              columns={GALLERY_CHECK_RUNS}
              rows={GALLERY_CHECK_ROWS}
              caption='图 1 · 五次运行都没修好 replica 的执行计划；运行 4 没过安全门槛，后面的检查不再执行。示例只列出部分检查。'
            />
          </Specimen>
          <Specimen
            caption='score deltas as the miss · many runs scroll sideways inside the frame · no caption'
            span={3}
          >
            <CheckGrid
              rowHeader='Check'
              passedLabel='Passed'
              uncheckedLabel='Not checked'
              columns={GALLERY_CHECK_MANY_RUNS}
              rows={GALLERY_CHECK_SCORE_ROWS}
            />
          </Specimen>
        </div>

        <SectionDivider>StackedBar</SectionDivider>
        <div className='gallery__stack'>
          <StackedBarSpecimen />
          <div className='gallery__row'>
            <StackedBarChangeSpecimen />
          </div>
        </div>

        <SectionDivider>Dialog</SectionDivider>
        <DialogSpecimen />

        <SectionDivider>BlastRadiusBar</SectionDivider>
        <div className='gallery__stack'>
          <BlastRadiusBar
            value={20}
            centerLabel='Node Group A · 20 %'
            surface={{
              id: 'gallery.blast.20',
              kind: 'metric',
              label: 'Blast radius · Node Group A',
              askSuggestions: ['Is this blast radius safe?'],
              project: (data) => ({
                fields: [
                  { name: 'value', type: 'number', value: data.value },
                  {
                    name: 'centerLabel',
                    type: 'string',
                    value: data.centerLabel ?? '',
                  },
                ],
              }),
            }}
          />
          <BlastRadiusBar value={65} centerLabel='Node Group A · 65 %' />
          <BlastRadiusBar value={92} centerLabel='Node Group A · 92 %' />
          <BlastRadiusBar value={50} hideTicks />
        </div>
      </Panel>

      {/* ── Data display ───────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Data display</PanelTitle>}>
        <SectionDivider>StatBlock</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='vertical · emphasized · number role'>
            <StatBlock
              label='运行次数'
              value={40}
              direction='vertical'
              emphasized
            />
          </Specimen>
          <Specimen caption='vertical · numeric role'>
            <StatBlock label='运行次数' value={40} direction='vertical' />
          </Specimen>
          <Specimen caption='horizontal · label left'>
            <StatBlock
              label='latency_p99'
              value='142'
              unit='ms'
              surface={{
                id: 'gallery.stat.latency-p99',
                kind: 'metric',
                label: 'latency_p99',
                askSuggestions: ['Is this latency normal?'],
                project: (data) => ({
                  fields: [
                    {
                      name: 'metric',
                      type: 'string',
                      value: String(data.label),
                    },
                    {
                      name: 'value',
                      type: 'string',
                      value: String(data.value),
                    },
                    {
                      name: 'unit',
                      type: 'string',
                      value: String(data.unit ?? ''),
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='vertical · emphasized · unit'>
            <StatBlock
              label='error_rate'
              value='0.42'
              unit='%'
              direction='vertical'
              emphasized
            />
          </Specimen>
          <Specimen caption='inverted'>
            <div className='gallery__inverted-host'>
              <StatBlock label='Throughput' value='9 384' unit='rps' inverted />
            </div>
          </Specimen>
          <Specimen caption='animateValue · counts up once over --motion-chart'>
            <StatBlockCountUpSpecimen />
          </Specimen>
          <Specimen caption='animateValue · keeps decimals'>
            <StatBlock
              label='Mean score'
              value={0.83}
              direction='vertical'
              emphasized
              animateValue
            />
          </Specimen>
        </div>

        <SectionDivider>KeyValueList</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='mono keys (parameters)' span={2}>
            <KeyValueList
              items={KV_PARAMS}
              surface={{
                id: 'gallery.kv.params',
                kind: 'detail',
                label: 'Experiment parameters',
                askSuggestions: ['What do these parameters mean?'],
                project: (items) => ({
                  fields: items.map((it) => ({
                    name: String(it.k),
                    type: 'string',
                    value: String(it.v),
                  })),
                }),
              }}
            />
          </Specimen>
          <Specimen caption='uppercase keys (metadata)' span={2}>
            <KeyValueList items={KV_META} uppercaseKeys />
          </Specimen>
        </div>

        <SectionDivider>SparkLine</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='rising'>
            <div className='gallery__spark-host'>
              <SparkLine
                points={SPARK_RISING}
                surface={{
                  id: 'gallery.spark.rising',
                  kind: 'chart',
                  label: 'Sparkline · rising',
                  askSuggestions: ['What does this trend indicate?'],
                  project: (points) => ({
                    fields: [
                      { name: 'count', type: 'number', value: points.length },
                      {
                        name: 'last',
                        type: 'number',
                        value: points[points.length - 1] ?? 0,
                      },
                    ],
                  }),
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='dip / recover'>
            <div className='gallery__spark-host'>
              <SparkLine points={SPARK_DIP} />
            </div>
          </Specimen>
          <Specimen caption='flat (low signal)'>
            <div className='gallery__spark-host'>
              <SparkLine points={SPARK_FLAT} />
            </div>
          </Specimen>
          <Specimen caption='inverted'>
            <div className='gallery__spark-host gallery__spark-host--inverted'>
              <SparkLine points={SPARK_RISING} inverted />
            </div>
          </Specimen>
        </div>

        <SectionDivider>MetricCard</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='value only'>
            <MetricCard label='Active injections' value='3' />
          </Specimen>
          <Specimen caption='value + unit'>
            <MetricCard label='Latency p99' value='142' unit='ms' />
          </Specimen>
          <Specimen caption='value + sparkline'>
            <MetricCard
              label='Throughput'
              value='9 384'
              unit='rps'
              sparkline={SPARK_RISING}
              surface={{
                id: 'gallery.metric.throughput',
                kind: 'metric',
                label: 'Throughput metric card',
                askSuggestions: ['Is throughput trending up?'],
                project: (data) => ({
                  fields: [
                    {
                      name: 'metric',
                      type: 'string',
                      value: String(data.label),
                    },
                    {
                      name: 'value',
                      type: 'string',
                      value: String(data.value),
                    },
                    {
                      name: 'unit',
                      type: 'string',
                      value: String(data.unit ?? ''),
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='inverted + sparkline'>
            <MetricCard
              label='Error budget'
              value='0.42'
              unit='%'
              sparkline={SPARK_DIP}
              inverted
            />
          </Specimen>
        </div>

        <SectionDivider>EmptyState</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='default'>
            <EmptyState
              title='No injections'
              description='Create your first fault injection to begin.'
            />
          </Specimen>
          <Specimen caption='with action'>
            <EmptyState
              title='No projects'
              description='Projects group experiments and their results.'
              action={<Chip tone='ink'>+ New project</Chip>}
            />
          </Specimen>
          <Specimen caption='icon at --size-icon-xl'>
            <EmptyState
              icon={<InboxOutlined className='gallery__icon-xl' />}
              title='Pick an x-axis metric'
              description='The chart needs two metrics to compare.'
            />
          </Specimen>
        </div>

        <SectionDivider>Skeleton</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='block bars'>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                width: 240,
              }}
            >
              <Skeleton block height={24} />
              <Skeleton block height={16} />
              <Skeleton block height={16} style={{ width: '60%' }} />
            </div>
          </Specimen>
          <Specimen caption='circle + text'>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                alignItems: 'center',
                width: 240,
              }}
            >
              <Skeleton width={32} height={32} radius='circle' />
              <div style={{ flex: 1 }}>
                <SkeletonText lines={2} />
              </div>
            </div>
          </Specimen>
          <Specimen caption='SkeletonText 4 lines'>
            <div style={{ width: 240 }}>
              <SkeletonText lines={4} />
            </div>
          </Specimen>
        </div>

        <SectionDivider>TimeDisplay</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='absolute'>
            <TimeDisplay value='2026-05-10T14:22:01Z' mode='absolute' />
          </Specimen>
          <Specimen caption='relative'>
            <TimeDisplay value={Date.now() - 120000} mode='relative' />
          </Specimen>
          <Specimen caption='duration'>
            <TimeDisplay value={2840} mode='duration' />
          </Specimen>
        </div>

        <SectionDivider>TimeRangePicker</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='default · now-1h'>
            <TimeRangePickerSpecimen initial='now-1h' />
          </Specimen>
          <Specimen caption='custom presets incl. 30d'>
            <TimeRangePickerSpecimen
              initial='now-30d'
              presets={[
                { label: '1h', value: 'now-1h' },
                { label: '24h', value: 'now-24h' },
                { label: '7d', value: 'now-7d' },
                { label: '30d', value: 'now-30d' },
              ]}
            />
          </Specimen>
          <Specimen caption='controlled · logs to console'>
            <TimeRangePickerSpecimen initial='now-15m' logToConsole />
          </Specimen>
        </div>
      </Panel>

      {/* ── Lists / rows ───────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Lists &amp; rows</PanelTitle>}>
        <SectionDivider extra={<MetricLabel>Click any row</MetricLabel>}>
          ControlListItem
        </SectionDivider>
        <div className='gallery__list'>
          {[
            {
              id: 'item-1',
              name: 'Network Partition',
              desc: 'Isolate node clusters',
            },
            { id: 'item-2', name: 'CPU Stress', desc: 'Resource exhaustion' },
            {
              id: 'item-3',
              name: 'Clock Drift',
              desc: 'Synchronicity failure',
            },
            {
              id: 'item-4',
              name: 'Process Killer',
              desc: 'Random PID termination',
            },
          ].map((it) => {
            const isActive = active === it.id;
            return (
              <ControlListItem
                key={it.id}
                active={isActive}
                onClick={() => setActive(isActive ? '' : it.id)}
                left={
                  <div>
                    <div className='gallery__list-name'>{it.name}</div>
                    <MetricLabel size='xs' inverted={isActive}>
                      {it.desc}
                    </MetricLabel>
                  </div>
                }
                right={
                  <MetricLabel inverted={isActive}>
                    {isActive ? 'Stop' : 'Run'}
                  </MetricLabel>
                }
              />
            );
          })}
        </div>

        <SectionDivider>Static rows (no onClick)</SectionDivider>
        <div className='gallery__list'>
          <ControlListItem
            action={GALLERY_ACTIONS.controlRun}
            left={
              <>
                <StatusDot pulse />
                <span>worker-alpha</span>
              </>
            }
            right={<MetricLabel>Ready</MetricLabel>}
          />
          <ControlListItem
            left={
              <>
                <StatusDot />
                <span>worker-beta</span>
              </>
            }
            right={<MetricLabel>Idle</MetricLabel>}
          />
          <ControlListItem
            left={
              <>
                <StatusDot tone='warning' pulse />
                <span>worker-gamma</span>
              </>
            }
            right={<MetricLabel>Recovering</MetricLabel>}
          />
        </div>

        <SectionDivider>ControlListItem · description</SectionDivider>
        <ControlListItemDescriptionSpecimen />
      </Panel>

      {/* ── Tables & Toolbar ───────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Tables & Toolbar</PanelTitle>}>
        <SectionDivider>Toolbar</SectionDivider>
        <Specimen caption='search + filters + action' span={3}>
          <Toolbar
            searchPlaceholder='Search injections…'
            searchValue='latency'
            filters={[
              { key: 'type', label: 'type: NetworkLatency' },
              { key: 'target', label: 'target: order-svc' },
            ]}
            action={<Chip tone='ink'>+ New injection</Chip>}
          />
        </Specimen>

        <SectionDivider>DataTable · framed</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption='default · own card, header flush and clipped by --radius-lg · IdentityCell main column · numeric columns · no separator under the last row'
            span={3}
          >
            <DataTable
              columns={GALLERY_TASK_COLUMNS}
              data={GALLERY_TASK_ROWS}
              rowKey={(row) => row.id}
            />
          </Specimen>
          <Specimen
            caption='framed={false} in a titled Panel padded={false}'
            span={3}
          >
            <Panel
              title='按模型'
              description='示例只列出部分'
              padded={false}
              className='gallery__menu-host'
            >
              <DataTable
                framed={false}
                columns={GALLERY_MODEL_COLUMNS}
                data={GALLERY_MODEL_ROWS}
                rowKey={(row) => row.model}
              />
            </Panel>
          </Specimen>
        </div>

        <SectionDivider>DataTable · with data</SectionDivider>
        <Specimen
          caption='mono ids · chips · numeric duration · agent surface'
          span={3}
        >
          <DataTable
            columns={[
              {
                key: 'id',
                header: 'ID',
                render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
              },
              {
                key: 'type',
                header: 'Type',
                render: (row) => row.type,
              },
              {
                key: 'target',
                header: 'Target',
                render: (row) => row.target,
              },
              {
                key: 'duration',
                header: 'Duration',
                numeric: true,
                render: (row) => row.duration,
              },
              {
                key: 'state',
                header: 'State',
                align: 'center',
                render: (row) => {
                  const tone =
                    row.state === 'running'
                      ? 'ink'
                      : row.state === 'failed'
                        ? 'warning'
                        : 'default';
                  return <Chip tone={tone}>{row.state}</Chip>;
                },
              },
            ]}
            data={[
              {
                id: 'INJ-0001',
                type: 'NetworkLatency',
                target: 'order-svc',
                duration: '120 s',
                state: 'running',
              },
              {
                id: 'INJ-0002',
                type: 'CPUStress',
                target: 'cart-svc',
                duration: '300 s',
                state: 'queued',
              },
              {
                id: 'INJ-0003',
                type: 'PodKill',
                target: 'inventory',
                duration: '—',
                state: 'failed',
              },
            ]}
            rowKey={(row) => row.id}
            surface={{
              id: 'gallery.table.injections',
              kind: 'table',
              label: 'Injections table',
              askSuggestions: ['Which injections are failing?'],
              project: (rows) => ({
                entities: rows.map((r) => ({
                  id: r.id,
                  type: 'injection',
                  label: r.id,
                  data: { type: r.type, target: r.target, state: r.state },
                })),
              }),
            }}
          />
        </Specimen>

        <SectionDivider>DataTable · numeric columns</SectionDivider>
        <Specimen
          caption='numeric: true · right-aligned header and cells · --font-numeric tabular figures · 0.00 and —'
          span={3}
        >
          <DataTable
            columns={GALLERY_MODEL_COLUMNS}
            data={GALLERY_MODEL_ROWS}
            rowKey={(row) => row.model}
          />
        </Specimen>

        <SectionDivider>DataTable · row click</SectionDivider>
        <DataTableRowClickSpecimen />

        <SectionDivider>DataTable · expandable rows</SectionDivider>
        <DataTableExpandableSpecimen />

        <SectionDivider>
          DataTable · stickyFirstColumn · cellTone · stale
        </SectionDivider>
        <DataTableMatrixSpecimen />

        <SectionDivider>DataTable · mobile cards</SectionDivider>
        <DataTableMobileCardSpecimen />

        <SectionDivider>DataTable · loading</SectionDivider>
        <Specimen caption='skeleton shimmer' span={3}>
          <DataTable
            columns={[
              { key: 'id', header: 'ID', render: () => '' },
              { key: 'type', header: 'Type', render: () => '' },
              { key: 'status', header: 'Status', render: () => '' },
            ]}
            data={[]}
            rowKey={(_, i) => i}
            loading
          />
        </Specimen>

        <SectionDivider>DataTable · empty</SectionDivider>
        <Specimen caption='EmptyState inline' span={3}>
          <DataTable
            columns={[
              { key: 'id', header: 'ID', render: () => '' },
              { key: 'type', header: 'Type', render: () => '' },
            ]}
            data={[]}
            rowKey={(_, i) => i}
            emptyTitle='No executions'
            emptyDescription='Run an experiment to see results here.'
          />
        </Specimen>

        <SectionDivider>DataTable · pagination</SectionDivider>
        <DataTablePaginationSpecimen />

        <SectionDivider>DataTable · actions column</SectionDivider>
        <Specimen
          caption="kind: 'actions' · right-aligned, gapped, wraps"
          span={3}
        >
          <DataTable
            columns={[
              ...GALLERY_RUN_COLUMNS.slice(0, 2),
              {
                key: 'actions',
                header: '',
                kind: 'actions',
                render: (row) => (
                  <>
                    <AegisButton tone='ghost'>Logs</AegisButton>
                    <AegisButton tone='ghost'>Rerun</AegisButton>
                    <AegisButton
                      tone='secondary'
                      disabled={row.state !== 'running'}
                    >
                      Stop
                    </AegisButton>
                  </>
                ),
              },
            ]}
            data={GALLERY_RUNS.slice(0, 3)}
            rowKey={(row) => row.id}
          />
        </Specimen>

        <SectionDivider>EventTable</SectionDivider>
        <Specimen
          caption='virtualized · sticky header · selection · onLoadMore'
          span={3}
        >
          <EventTableSpecimen />
        </Specimen>

        <SectionDivider>DataList</SectionDivider>
        <Specimen caption='compact list · selectable rows' span={3}>
          <DataList
            items={[
              { id: 'ds-001', name: 'wikitext-103', status: 'ready' },
              { id: 'ds-002', name: 'imagenet-mini', status: 'syncing' },
              { id: 'ds-003', name: 'common-crawl-en', status: 'ready' },
            ]}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status' },
            ]}
            selectedId='ds-002'
            surface={{
              id: 'gallery.list.datasets',
              kind: 'list',
              label: 'Datasets list',
              askSuggestions: ['Which dataset is still syncing?'],
              project: (rows) => ({
                entities: rows.map((r) => ({
                  id: r.id,
                  type: 'dataset',
                  label: r.name,
                  data: { status: r.status },
                })),
              }),
            }}
          />
        </Specimen>
      </Panel>

      {/* ── Agent trajectory ───────────────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Agent trajectory</PanelTitle>}
        extra={<MetricLabel>Observation · reasoning · action</MetricLabel>}
      >
        <SectionDivider>ToolCallCard</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='with result' span={2}>
            <ToolCallCard
              data={TOOL_QUERY_METRICS}
              surface={{
                id: 'gallery.toolcall.query-metrics',
                kind: 'panel',
                label: 'Tool call · query_metrics',
                askSuggestions: ['What did this tool call return?'],
                project: (data) => ({
                  fields: [
                    { name: 'tool', type: 'string', value: data.name },
                    {
                      name: 'arguments',
                      type: 'string',
                      value: data.arguments ?? '',
                    },
                    {
                      name: 'result',
                      type: 'string',
                      value: data.result ?? '',
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='no result yet' span={2}>
            <ToolCallCard
              data={{
                name: 'fetch_logs',
                arguments:
                  '{\n  "service": "payment",\n  "level": "error",\n  "limit": 50\n}',
              }}
            />
          </Specimen>
          <Specimen caption='running' span={2}>
            <ToolCallCard
              data={{
                name: 'bash',
                arguments: '{\n  "cmd": "ls -la /var/log"\n}',
                status: 'running',
              }}
            />
          </Specimen>
          <Specimen caption='error · anomaly chip' span={2}>
            <ToolCallCard
              data={{
                name: 'read_file',
                arguments: '{\n  "path": "/etc/missing.conf"\n}',
                status: 'error',
                isError: true,
                result:
                  'Traceback (most recent call last):\n  File "read_file.py", line 12\nFileNotFoundError: /etc/missing.conf',
              }}
            />
          </Specimen>
        </div>

        <SectionDivider>TrajectoryStep</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='collapsed' span={2}>
            <TrajectoryStep
              data={{
                step: 1,
                timestamp: '14:22:01',
                durationMs: 1240,
                actionType: 'tool_call',
                action:
                  'query_metrics(service="catalog", metric="latency_p99")',
              }}
            />
          </Specimen>
          <Specimen caption='expanded · full step' span={2}>
            <TrajectoryStep
              data={TRAJECTORY_STEPS[0]}
              defaultExpanded
              surface={{
                id: 'gallery.trajectory.step1',
                kind: 'panel',
                label: 'Trajectory step · 1',
                askSuggestions: ['Why did the agent take this step?'],
                project: (data) => ({
                  fields: [
                    { name: 'step', type: 'number', value: data.step },
                    {
                      name: 'actionType',
                      type: 'string',
                      value: data.actionType ?? '',
                    },
                    {
                      name: 'durationMs',
                      type: 'number',
                      value: data.durationMs ?? 0,
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='summary · several calls · sections' span={2}>
            <TrajectoryStep
              data={TRAJECTORY_STEP_SEVERAL_CALLS}
              defaultExpanded
            />
          </Specimen>
        </div>

        <SectionDivider>TrajectoryTimeline</SectionDivider>
        <div className='gallery__trajectory-host'>
          <TrajectoryTimeline
            agentName='rca-agent'
            status='completed'
            totalDurationMs={4790}
            steps={TRAJECTORY_STEPS}
            surface={{
              id: 'gallery.trajectory.timeline',
              kind: 'timeline',
              label: 'rca-agent trajectory',
              askSuggestions: ['Summarize the agent reasoning'],
              project: (steps) => ({
                fields: [
                  { name: 'stepCount', type: 'number', value: steps.length },
                  { name: 'agent', type: 'string', value: 'rca-agent' },
                ],
              }),
            }}
          />
        </div>
        <div className='gallery__stack'>
          <Specimen caption='header={false} · inside a titled Panel' span={3}>
            <Panel title='Agent steps'>
              <TrajectoryTimeline
                header={false}
                steps={TRAJECTORY_STEPS.slice(0, 2)}
              />
            </Panel>
          </Specimen>
        </div>

        <SectionDivider>ContentInspectorDialog · ContentPreview</SectionDivider>
        <ContentInspectorSpecimen />

        <SectionDivider>SessionRunView</SectionDivider>
        <SessionRunViewSpecimen />
      </Panel>

      {/* ── Logs / Terminal ────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Logs — Terminal</PanelTitle>}>
        <SectionDivider>Terminal · plain</SectionDivider>
        <Terminal
          lines={TERMINAL_LINES}
          surface={{
            id: 'gallery.terminal.plain',
            kind: 'terminal',
            label: 'Experiment log',
            askSuggestions: ['Summarize the log', 'Anything anomalous?'],
            project: (lines) => ({
              fields: [
                { name: 'lineCount', type: 'number', value: lines.length },
                {
                  name: 'lastLine',
                  type: 'string',
                  value: lines[lines.length - 1]?.body ?? '',
                },
              ],
            }),
          }}
        />

        <SectionDivider>Terminal · with log levels</SectionDivider>
        <Terminal
          lines={[
            {
              ts: '14:22:01',
              prefix: 'debug',
              level: 'debug',
              body: 'Worker pool initialized with 4 threads.',
            },
            {
              ts: '14:22:05',
              prefix: 'info',
              level: 'info',
              body: 'Experiment "playing-the-world" started.',
            },
            {
              ts: '14:23:12',
              prefix: 'warn',
              level: 'warn',
              body: 'Latency variance exceeds baseline by 15%.',
            },
            {
              ts: '14:23:18',
              prefix: 'error',
              level: 'error',
              body: 'Data consistency thresholds breached in node 04.',
            },
          ]}
        />

        <SectionDivider>CodeBlock</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='json' span={2}>
            <CodeBlock
              language='json'
              code={
                '{\n  "service": "catalog",\n  "metric": "latency_p99",\n  "value": 482,\n  "unit": "ms"\n}'
              }
              surface={{
                id: 'gallery.codeblock.json',
                kind: 'code',
                label: 'JSON snippet',
                askSuggestions: ['Explain this JSON'],
                project: (data) => ({
                  fields: [
                    { name: 'language', type: 'string', value: data.language },
                    {
                      name: 'lines',
                      type: 'number',
                      value: data.code.split('\n').length,
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='bash' span={2}>
            <CodeBlock
              language='bash'
              code={
                "kubectl apply -f injection.yaml\nwatch -n 1 'kubectl get pods'"
              }
            />
          </Specimen>
          <Specimen caption='any language string · typescript' span={2}>
            <CodeBlock
              language='typescript'
              showLineNumbers
              code={
                "const latency = await probe('catalog');\nif (latency.p99 > 400) {\n  alert(latency);\n}"
              }
            />
          </Specimen>
          <Specimen caption='maxHeight={120} · scrolls inside' span={2}>
            <CodeBlock
              language='json'
              maxHeight={120}
              code={JSON.stringify(
                {
                  verdict: 'failed',
                  checks: Array.from({ length: 8 }, (_, i) => ({
                    id: `check-${String(i + 1)}`,
                    passed: i % 3 !== 0,
                  })),
                },
                null,
                2
              )}
            />
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>File browser</MetricLabel>}>
          FileTree
        </SectionDivider>
        <div className='gallery__stack'>
          <Specimen
            caption='click or arrow keys · Enter opens a file · Left/Right fold · beside a CodeBlock'
            span={3}
          >
            <FileTreeSpecimen />
          </Specimen>
          <div className='gallery__row'>
            <Specimen
              caption='directories collapsed · note = file count'
              span={2}
            >
              <div style={{ width: 320 }}>
                <FileTree
                  files={GALLERY_TASK_FILES}
                  ariaLabel='Task files, collapsed'
                />
              </div>
            </Specimen>
            <Specimen
              caption='selected · long names end in an ellipsis, the title shows the path'
              span={2}
            >
              <div style={{ width: 240 }}>
                <FileTree
                  files={GALLERY_TASK_FILES}
                  ariaLabel='Task files, narrow'
                  selectedPath='tests/cases/replica_lag_within_budget_after_rollback.py'
                  defaultExpandedPaths={['tests/']}
                />
              </div>
            </Specimen>
            <Specimen
              caption='controlled · expandedPaths + onExpandedPathsChange'
              span={2}
            >
              <FileTreeControlledSpecimen />
            </Specimen>
          </div>
        </div>
      </Panel>

      {/* ── Navigation & identity primitives ───────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Navigation · Rosetta</PanelTitle>}>
        <SectionDivider
          extra={
            <MetricLabel>Selected indicator slides · --motion-base</MetricLabel>
          }
        >
          Tabs
        </SectionDivider>
        <TabsSegmentedSpecimen />

        <SectionDivider>Tabs · overflow</SectionDivider>
        <TabsOverflowSpecimen />

        <SectionDivider>Tabs · view switch</SectionDivider>
        <TabsViewSwitchSpecimen />

        <SectionDivider>Carousel</SectionDivider>
        <div className='gallery__row'>
          <Specimen
            caption="uncontrolled · defaultActiveKey='replay' · hover or focus pauses the progress bar · the button stops autoplay until pressed again"
            span={3}
          >
            <Carousel
              ariaLabel='首页轮播'
              slides={GALLERY_CAROUSEL_SLIDES}
              defaultActiveKey='replay'
              className='gallery__stack--fill'
            />
          </Specimen>
        </div>

        <SectionDivider>Carousel · controlled</SectionDivider>
        <CarouselControlledSpecimen />

        <SectionDivider
          extra={<MetricLabel>Pill · 32 high · lifts on hover</MetricLabel>}
        >
          Button
        </SectionDivider>
        <div className='gallery__row'>
          <Specimen caption="tone='primary'">
            <AegisButton>Run evaluation</AegisButton>
          </Specimen>
          <Specimen caption="tone='secondary'">
            <AegisButton tone='secondary'>Compare models</AegisButton>
          </Specimen>
          <Specimen caption="tone='ghost'">
            <AegisButton tone='ghost'>View script</AegisButton>
          </Specimen>
          <Specimen caption="icon · iconPosition='start'">
            <AegisButton tone='secondary' icon={<DownloadOutlined />}>
              Download
            </AegisButton>
          </Specimen>
          <Specimen caption="icon · iconPosition='end'">
            <AegisButton
              tone='ghost'
              icon={<ArrowRightOutlined />}
              iconPosition='end'
            >
              All runs
            </AegisButton>
          </Specimen>
          <Specimen caption='aria-pressed · toggle filters' span={2}>
            <ButtonPressedSpecimen />
          </Specimen>
          <Specimen caption='disabled' span={2}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <AegisButton disabled>Run evaluation</AegisButton>
              <AegisButton tone='secondary' disabled>
                Compare models
              </AegisButton>
              <AegisButton tone='ghost' disabled>
                View script
              </AegisButton>
            </div>
          </Specimen>
          <Specimen caption="tone='glass' · on a tinted backdrop" span={2}>
            <ButtonGlassStage>
              <AegisButton tone='glass'>Read the method</AegisButton>
              <AegisButton tone='glass' icon={<DownloadOutlined />}>
                Download
              </AegisButton>
              <AegisButton>Open results</AegisButton>
            </ButtonGlassStage>
          </Specimen>
        </div>

        <SectionDivider
          extra={<MetricLabel>Button look · link behaviour</MetricLabel>}
        >
          ButtonLink
        </SectionDivider>
        <div className='gallery__row'>
          <Specimen caption="tone='primary' · opens another page">
            <ButtonLink to='#button-link'>
              View the representative run
            </ButtonLink>
          </Specimen>
          <Specimen caption="tone='secondary' · icon at the end">
            <ButtonLink
              tone='secondary'
              to='#button-link'
              icon={<ArrowRightOutlined />}
              iconPosition='end'
            >
              All collections
            </ButtonLink>
          </Specimen>
          <Specimen caption="tone='ghost'">
            <ButtonLink tone='ghost' to='#button-link'>
              All 100 runs
            </ButtonLink>
          </Specimen>
          <Specimen caption="tone='glass' · on a tinted backdrop" span={2}>
            <ButtonGlassStage>
              <ButtonLink
                tone='glass'
                to='#button-link'
                icon={<ArrowRightOutlined />}
                iconPosition='end'
              >
                How we grade
              </ButtonLink>
            </ButtonGlassStage>
          </Specimen>
        </div>

        <SectionDivider>Breadcrumb</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='simple'>
            <Breadcrumb items={[{ label: 'Dashboard' }]} />
          </Specimen>
          <Specimen caption='with links' span={2}>
            <Breadcrumb
              items={[
                { label: 'Projects', to: '/projects' },
                { label: 'catalog-service', to: '/projects/1' },
                { label: 'Injections' },
              ]}
            />
          </Specimen>
          <Specimen caption='long item truncates with an ellipsis' span={3}>
            <Breadcrumb
              items={[
                { label: 'Results', to: '/results' },
                {
                  label:
                    'external/bench/checkout-latency-regression-under-sustained-write-load-after-the-index-rebuild',
                  to: '/tasks/3f9c2a1b7d04',
                },
                { label: 'Run 3f9c2a1b' },
              ]}
            />
          </Specimen>
        </div>

        <SectionDivider>TableOfContents · states</SectionDivider>
        <TableOfContentsStatesSpecimen />

        <SectionDivider>TableOfContents · scroll tracking</SectionDivider>
        <TableOfContentsScrollSpecimen />

        <SectionDivider>Avatar</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='initials · sm'>
            <Avatar
              size='sm'
              name='Ada Lovelace'
              surface={{
                id: 'gallery.avatar.ada',
                kind: 'entity',
                label: 'Ada Lovelace',
                askSuggestions: ['Who is this user?'],
                project: (data) => ({
                  entities: [
                    { id: 'user-ada', type: 'user', label: data.name },
                  ],
                  fields: [{ name: 'name', type: 'string', value: data.name }],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='initials · md'>
            <Avatar size='md' name='Grace Hopper' />
          </Specimen>
          <Specimen caption='initials · lg'>
            <Avatar size='lg' name='Alan Turing' />
          </Specimen>
          <Specimen caption='icon fallback'>
            <Avatar size='md' name='User' icon={<UserOutlined />} />
          </Specimen>
          <Specimen caption='from image'>
            <Avatar size='lg' name='Linus Torvalds' src={AVATAR_SAMPLE_SRC} />
          </Specimen>
          <Specimen caption='status · online'>
            <Avatar size='lg' name='Margaret Hamilton' status='online' />
          </Specimen>
          <Specimen caption='status · busy'>
            <Avatar size='lg' name='Donald Knuth' status='busy' />
          </Specimen>
          <Specimen caption='status · away'>
            <Avatar size='lg' name='Edsger Dijkstra' status='away' />
          </Specimen>
          <Specimen caption='status · offline'>
            <Avatar size='lg' name='Barbara Liskov' status='offline' />
          </Specimen>
        </div>
        <div className='gallery__row'>
          {([1, 2, 3, 4, 5, 6] as const).map((slot) => (
            <Specimen key={slot} caption={`colorSlot={${String(slot)}} · sm`}>
              <Avatar
                size='sm'
                name={`model ${String(slot)}`}
                colorSlot={slot}
              />
            </Specimen>
          ))}
        </div>

        <SectionDivider
          extra={<MetricLabel>Body name · mono id or path</MetricLabel>}
        >
          IdentityCell
        </SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='avatar · colorSlot · link · mono secondary'>
            <IdentityCell
              avatar
              colorSlot={2}
              name='claude-opus-4-1'
              secondary='13c2dea9bcbb'
              to='#identity-cell'
            />
          </Specimen>
          <Specimen caption='no avatar · link · source path'>
            <IdentityCell
              name='checkout-latency-regression'
              secondary='external / bench / checkout-latency-regression'
              to='#identity-cell'
            />
          </Specimen>
          <Specimen caption='inline · plain name'>
            <IdentityCell
              avatar
              colorSlot={4}
              name='gpt-5'
              secondary='3f9c2a1b7d04'
              inline
            />
          </Specimen>
          <Specimen caption='long name and secondary truncate'>
            <div className='gallery__narrow-cell'>
              <IdentityCell
                avatar
                name='qwen3-coder-480b-a35b-instruct-preview'
                secondary='external/swe-bench/qwen3-coder-480b-a35b-instruct'
                to='#identity-cell'
              />
            </div>
          </Specimen>
        </div>
        <div className='gallery__row'>
          <Specimen caption='name only · avatar · colorSlot · link'>
            <IdentityCell
              avatar
              colorSlot={1}
              name='claude-opus-4-1'
              to='#identity-cell'
            />
          </Specimen>
          <Specimen caption='name only · plain text'>
            <IdentityCell avatar colorSlot={3} name='deepseek-v3.2' />
          </Specimen>
          <Specimen caption='name only · long name truncates'>
            <div className='gallery__narrow-cell'>
              <IdentityCell
                avatar
                colorSlot={5}
                name='qwen3-coder-480b-a35b-instruct-preview'
                to='#identity-cell'
              />
            </div>
          </Specimen>
          <Specimen caption='wrap · long name and secondary wrap'>
            <div className='gallery__narrow-cell'>
              <IdentityCell
                name='部署回滚后为批量导出审批执行计划'
                secondary='30434932d311 · external/dba-bench/tidb-sql-binding-approval-for-batch-export-after-rollback'
                to='#identity-cell'
                wrap
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>TextField</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='label · value · helper'>
            <TextField
              label='Experiment'
              defaultValue='checkout-latency'
              helperText='Shown in run lists.'
            />
          </Specimen>
          <Specimen caption='placeholder · helper'>
            <TextField
              label='Email'
              placeholder='you@example.com'
              helperText='We never share your email.'
            />
          </Specimen>
          <Specimen caption='with leading icon'>
            <TextField
              label='Username'
              placeholder='ada'
              leadingIcon={<UserOutlined />}
            />
          </Specimen>
          <Specimen caption='error'>
            <TextField
              label='Email'
              defaultValue='not-an-email'
              error='Enter a valid email address.'
            />
          </Specimen>
          <Specimen caption='disabled'>
            <TextField label='Read-only' defaultValue='aegis-001' disabled />
          </Specimen>
        </div>

        <SectionDivider>PasswordField</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='default'>
            <PasswordField
              label='Password'
              placeholder='••••••••'
              helperText='At least 8 characters.'
            />
          </Specimen>
          <Specimen caption='error'>
            <PasswordField
              label='Password'
              defaultValue='abc'
              error='Too short — minimum 8 characters.'
            />
          </Specimen>
        </div>

        <SectionDivider>AuthLayout</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='login (preview)' span={3}>
            <div className='gallery__auth-preview'>
              <AuthLayout
                brand={
                  <span
                    style={{
                      fontFamily: 'var(--font-brand)',
                      fontWeight: 600,
                      letterSpacing: 'var(--tracking-brand)',
                    }}
                  >
                    AegisLab
                  </span>
                }
                title='Sign in'
                description='Use your AegisLab credentials to continue.'
                footer={
                  <>
                    Don&apos;t have an account? <a href='#signup'>Create one</a>
                  </>
                }
              >
                <TextField label='Email' placeholder='you@example.com' />
                <PasswordField label='Password' placeholder='••••••••' />
                <Button type='primary' block>
                  Sign in
                </Button>
              </AuthLayout>
            </div>
          </Specimen>
        </div>

        <SectionDivider>LoginForm</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='default · with remember + forgot' span={3}>
            <div className='gallery__form-frame'>
              <LoginForm
                onSubmit={(values) => {
                  console.warn('LoginForm submit', values);
                }}
                onForgotPassword={() => {
                  console.warn('LoginForm forgot password');
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='submitting' span={3}>
            <div className='gallery__form-frame'>
              <LoginForm onSubmit={() => undefined} submitting />
            </div>
          </Specimen>
          <Specimen caption='with error' span={3}>
            <div className='gallery__form-frame'>
              <LoginForm
                onSubmit={() => undefined}
                error='Invalid email or password.'
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>RegisterForm</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='default' span={3}>
            <div className='gallery__form-frame'>
              <RegisterForm
                onSubmit={(values) => {
                  console.warn('RegisterForm submit', values);
                }}
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>ForgotPasswordForm</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='default' span={3}>
            <div className='gallery__form-frame'>
              <ForgotPasswordForm
                onSubmit={(values) => {
                  console.warn('ForgotPasswordForm submit', values);
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='success state' span={3}>
            <div className='gallery__form-frame'>
              <ForgotPasswordForm
                onSubmit={() => undefined}
                success="Check your inbox — we've sent a reset link."
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>ErrorState</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='404 not found' span={3}>
            <ErrorState
              code={404}
              title='Page not found'
              description="The page you're looking for doesn't exist or has been moved."
              action={
                <AegisButton tone='primary'>Back to dashboard</AegisButton>
              }
            />
          </Specimen>
          <Specimen caption="size='compact' · inside a pane" span={2}>
            <ErrorState
              size='compact'
              title='Failed to load trajectory'
              description='ClickHouse returned 502 Bad Gateway.'
              action={<AegisButton tone='secondary'>Try again</AegisButton>}
            />
          </Specimen>
        </div>

        <SectionDivider>DropdownMenu</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='basic'>
            <DropdownMenu
              trigger={<Chip tone='ink'>Open menu</Chip>}
              items={[
                {
                  key: 'view',
                  label: 'View details',
                  action: GALLERY_ACTIONS.dropdownView,
                },
                { key: 'edit', label: 'Edit' },
                { key: 'del', label: 'Delete', danger: true },
              ]}
            />
          </Specimen>
          <Specimen caption='with icons' span={2}>
            <DropdownMenu
              trigger={<Chip tone='default'>User menu</Chip>}
              items={[
                { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
                {
                  key: 'settings',
                  label: 'Settings',
                  icon: <SettingOutlined />,
                },
                {
                  key: 'logout',
                  label: 'Logout',
                  icon: <LogoutOutlined />,
                  danger: true,
                },
              ]}
            />
          </Specimen>
          <Specimen caption='header · footerItems · dividers'>
            <DropdownMenu
              trigger={<Chip tone='default'>Workspace</Chip>}
              header={<MetricLabel size='xs'>Switch workspace</MetricLabel>}
              items={[
                { key: 'aegis', label: 'aegis-lab' },
                { key: 'sandbox', label: 'sandbox' },
              ]}
              footerItems={[
                {
                  key: 'new',
                  label: 'New workspace',
                  icon: <PlusOutlined />,
                },
              ]}
            />
          </Specimen>
          <Specimen
            caption='inside a Panel · trigger on its bottom edge · wide items escape the clip'
            span={2}
          >
            <Panel title='Run 4812' className='gallery__menu-host'>
              <div className='gallery__menu-host-foot'>
                <MetricLabel size='xs'>Actions</MetricLabel>
                <DropdownMenu
                  trigger={<Chip tone='default'>More</Chip>}
                  items={[
                    {
                      key: 'rerun',
                      label: 'Re-run with the same datapack and algorithm',
                      icon: <ReloadOutlined />,
                    },
                    {
                      key: 'export',
                      label: 'Export the trace bundle as Parquet',
                      icon: <DownloadOutlined />,
                    },
                    {
                      key: 'archive',
                      label: 'Archive',
                      disabled: true,
                    },
                    {
                      key: 'delete',
                      label: 'Delete run',
                      icon: <DeleteOutlined />,
                      danger: true,
                    },
                  ]}
                />
              </div>
            </Panel>
          </Specimen>
        </div>

        <SectionDivider>ProjectSelector</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='with projects · search · meta slot' span={2}>
            <div style={{ width: '100%' }}>
              <ProjectSelector
                projects={[
                  {
                    id: '1',
                    name: 'catalog-service',
                    action: GALLERY_ACTIONS.projectSelect,
                    meta: (
                      <>
                        <Chip tone='ink'>active</Chip>
                        <MonoValue size='sm'>128 inj</MonoValue>
                      </>
                    ),
                  },
                  {
                    id: '2',
                    name: 'order-platform',
                    meta: (
                      <>
                        <Chip tone='ghost'>archived</Chip>
                        <MonoValue size='sm'>12 inj</MonoValue>
                      </>
                    ),
                  },
                  { id: '3', name: 'inventory-v2' },
                ]}
                selectedId='1'
                onSelect={() => {
                  /* gallery specimen — no-op */
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='footerItems · view all + create' span={2}>
            <ProjectSelector
              projects={[
                { id: '1', name: 'catalog-service' },
                { id: '2', name: 'order-platform' },
              ]}
              selectedId='2'
              onSelect={() => {
                /* gallery specimen — no-op */
              }}
              footerItems={[
                {
                  key: 'all',
                  label: 'View all projects',
                  icon: <AppstoreOutlined />,
                },
                {
                  key: 'new',
                  label: 'New project',
                  icon: <PlusOutlined />,
                },
              ]}
            />
          </Specimen>
          <Specimen caption='empty state'>
            <ProjectSelector
              projects={[]}
              onSelect={() => {
                /* gallery specimen — no-op */
              }}
              placeholder='No projects'
            />
          </Specimen>
        </div>

        <SectionDivider>EnvironmentSwitcher</SectionDivider>
        <EnvironmentSwitcherSpecimen />

        <SectionDivider>PageSizeSelect</SectionDivider>
        <PageSizeSelectSpecimen />
      </Panel>

      {/* ── Layouts ────────────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Layouts</PanelTitle>}>
        <SectionDivider>PageHeader</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='title only' span={2}>
            <PageHeader title='Users' />
          </Specimen>
          <Specimen caption='with description' span={2}>
            <PageHeader
              title='API Keys'
              description='Manage SDK and service API keys for programmatic access.'
            />
          </Specimen>
          <Specimen caption='with action' span={2}>
            <PageHeader
              title='Teams'
              description='Organize members into teams.'
              action={<Chip tone='ink'>+ Create team</Chip>}
            />
          </Specimen>
          <Specimen caption='with meta row' span={2}>
            <PageHeader
              title='Checkout latency regression'
              description='external/bench/checkout-latency'
              meta={
                <>
                  <Chip tone='info' size='md'>
                    Code check
                  </Chip>
                  <span>
                    Evaluation version{' '}
                    <MonoValue size='sm'>3f9c2a1b7d04</MonoValue>
                  </span>
                </>
              }
            />
          </Specimen>
          <Specimen
            caption='--page-header-margin-bottom · --page-header-title-* · --page-header-description-*'
            span={3}
          >
            <div className='gallery__token-override'>
              <PageHeader
                title='Tasks'
                description='Every task in the current catalog, with its source and content version.'
              />
            </div>
          </Specimen>
          <Specimen
            caption='titleExtra beside the title · description with an avatar'
            span={3}
          >
            <div className='gallery__token-override'>
              <PageHeader
                title='Run 3f9c2a1b'
                titleExtra={
                  <>
                    <Chip tone='warning' size='lg'>
                      Failed
                    </Chip>
                    <span>
                      <MonoValue size='sm'>10/11</MonoValue> checks passed
                    </span>
                    <span>
                      Outcome <MonoValue size='sm'>0.82</MonoValue>
                    </span>
                  </>
                }
                description={
                  <IdentityCell
                    avatar
                    colorSlot={2}
                    name='claude-opus-4-1'
                    secondary='claude-code · 2026-10-27 09:14 UTC'
                    inline
                  />
                }
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>PageWrapper</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='--page-padding-inline (-mobile)' span={3}>
            <div className='gallery__token-override gallery__page-wrapper-host'>
              <PageWrapper>
                <div className='gallery__page-wrapper-content'>
                  Page content inset by the host&apos;s inline padding.
                </div>
              </PageWrapper>
            </div>
          </Specimen>
        </div>

        <SectionDivider>ColumnLayout</SectionDivider>
        <div className='gallery__stack'>
          <Specimen
            caption="columns='240fr 552fr 360fr' · one column at ≤768 px"
            span={3}
          >
            <div className='gallery__stack gallery__stack--fill'>
              <ColumnLayout columns='240fr 552fr 360fr'>
                <Panel title='Task and criteria'>
                  <p className='gallery__panel-body'>Narrow column.</p>
                </Panel>
                <Panel title='Agent answer'>
                  <p className='gallery__panel-body'>Wide column.</p>
                </Panel>
                <Panel title='Verdict'>
                  <p className='gallery__panel-body'>Side column.</p>
                </Panel>
              </ColumnLayout>
            </div>
          </Specimen>
          <Specimen
            caption="columns='872fr 304fr' · nested columns='1fr' stacks cards · gap='md'"
            span={3}
          >
            <div className='gallery__stack gallery__stack--fill'>
              <ColumnLayout columns='872fr 304fr' gap='md'>
                <Panel title='Instructions'>
                  <p className='gallery__panel-body'>Main column.</p>
                </Panel>
                <ColumnLayout columns='1fr' gap='md'>
                  <Panel title='Task facts'>
                    <p className='gallery__panel-body'>First card.</p>
                  </Panel>
                  <Panel title='Checks'>
                    <p className='gallery__panel-body'>Second card.</p>
                  </Panel>
                </ColumnLayout>
              </ColumnLayout>
            </div>
          </Specimen>
        </div>

        <SectionDivider>FormRow</SectionDivider>
        <div className='gallery__stack'>
          <FormRow
            label='Display name'
            description='Shown across the platform.'
          >
            <input
              type='text'
              defaultValue='Ada Lovelace'
              className='gallery__demo-input'
            />
          </FormRow>
          <FormRow label='API key' description='Treat as a secret.'>
            <input
              type='password'
              defaultValue='secret-token-xxx'
              className='gallery__demo-input'
            />
          </FormRow>
        </div>

        <SectionDivider>SettingsSection</SectionDivider>
        <SettingsSection
          title='Profile'
          description='Update your personal information and preferences.'
        >
          <FormRow
            label='Display name'
            description='Shown across the platform.'
          >
            <input
              type='text'
              defaultValue='Ada Lovelace'
              className='gallery__demo-input'
            />
          </FormRow>
          <FormRow
            label='Email'
            description='Used for notifications and login.'
          >
            <input
              type='text'
              defaultValue='ada@aegislab.io'
              className='gallery__demo-input'
            />
          </FormRow>
          <FormRow
            label='Timezone'
            description='All times are displayed in this zone.'
          >
            <select className='gallery__demo-input'>
              <option>UTC</option>
              <option>Asia/Shanghai</option>
              <option>America/New_York</option>
            </select>
          </FormRow>
        </SettingsSection>
        <SettingsSection
          title='Notifications'
          description='Choose what you want to be notified about.'
        >
          <FormRow
            label='Email alerts'
            description='Receive email for critical events.'
          >
            <label className='gallery__demo-toggle'>
              <input type='checkbox' defaultChecked />
              <span className='gallery__demo-toggle-track' />
            </label>
          </FormRow>
          <FormRow
            label='Slack integration'
            description='Push notifications to your Slack channel.'
          >
            <label className='gallery__demo-toggle'>
              <input type='checkbox' />
              <span className='gallery__demo-toggle-track' />
            </label>
          </FormRow>
        </SettingsSection>

        <SectionDivider>DangerZone</SectionDivider>
        <DangerZone description='Once you delete a project, all associated data will be permanently removed. This action cannot be undone.'>
          <div className='gallery__danger-row'>
            <span>
              Delete project <MonoValue size='sm'>catalog-service</MonoValue>
            </span>
            <button type='button' className='gallery__danger-btn'>
              Delete project
            </button>
          </div>
        </DangerZone>
      </Panel>

      {/* ── Notifications ──────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Notifications</PanelTitle>}>
        <SectionDivider>NotificationBell</SectionDivider>
        <NotificationProvider value={MOCK_NOTIF_VALUE}>
          <div className='gallery__row'>
            <Specimen caption='trigger · click to open'>
              <div className='gallery__notif-bell-host'>
                <NotificationBell
                  inboxPath='/inbox'
                  action={GALLERY_ACTIONS.notifOpen}
                />
              </div>
            </Specimen>
          </div>
        </NotificationProvider>

        <SectionDivider>InboxPage</SectionDivider>
        <NotificationProvider value={MOCK_NOTIF_VALUE}>
          <div className='gallery__inbox-frame'>
            <InboxPage
              surface={{
                id: 'gallery.inbox',
                kind: 'list',
                label: 'Inbox',
                askSuggestions: ['Any unread alerts?'],
                project: (items) => ({
                  entities: items.slice(0, 3).map((n) => ({
                    id: n.id,
                    type: 'notification',
                    label: n.title,
                    data: { severity: n.severity, read: n.read },
                  })),
                }),
              }}
            />
          </div>
        </NotificationProvider>
      </Panel>

      {/* ── Agent chat ─────────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Agent</PanelTitle>}>
        <SectionDivider>ChatMessage</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='user · plain text' span={2}>
            <ChatMessage
              role='user'
              senderName='You'
              avatar={<Avatar name='Alex Park' size='sm' />}
              content='Spin up a new project called rosetta-lab.'
              timestamp='12:04'
            />
          </Specimen>
          <Specimen caption='assistant · plain text' span={2}>
            <ChatMessage
              role='assistant'
              senderName='Aegis Assistant'
              avatar={<Avatar name='Aegis Assistant' size='sm' />}
              content='Creating project rosetta-lab under the platform team.'
              timestamp='12:04'
              surface={{
                id: 'gallery.chat.assistant',
                kind: 'message',
                label: 'Assistant message',
                askSuggestions: ['Summarize this message'],
                project: (data) => ({
                  fields: [
                    { name: 'role', type: 'string', value: data.role },
                    {
                      name: 'content',
                      type: 'string',
                      value: String(data.content),
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='assistant · with command card' span={2}>
            <ChatMessage
              role='assistant'
              senderName='Aegis Assistant'
              avatar={<Avatar name='Aegis Assistant' size='sm' />}
              content='Running the smoke experiment now.'
              timestamp='12:05'
              footer={
                <CommandInvocationCard
                  commandId={MOCK_INVOCATION_SUCCESS.commandId}
                  args={MOCK_INVOCATION_SUCCESS.args}
                  status={MOCK_INVOCATION_SUCCESS.status}
                />
              }
            />
          </Specimen>
        </div>

        <SectionDivider>CommandInvocationCard</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='pending' span={2}>
            <CommandInvocationCard
              commandId={MOCK_INVOCATION_PENDING.commandId}
              args={MOCK_INVOCATION_PENDING.args}
              status={MOCK_INVOCATION_PENDING.status}
              surface={{
                id: 'gallery.cmdinvoke.pending',
                kind: 'panel',
                label: 'Command invocation · pending',
                askSuggestions: ['What is this command doing?'],
                project: (data) => ({
                  fields: [
                    {
                      name: 'commandId',
                      type: 'string',
                      value: data.commandId,
                    },
                    {
                      name: 'status',
                      type: 'string',
                      value: String(data.status ?? ''),
                    },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='success · undo' span={2}>
            <CommandInvocationCard
              commandId={MOCK_INVOCATION_SUCCESS.commandId}
              args={MOCK_INVOCATION_SUCCESS.args}
              status={MOCK_INVOCATION_SUCCESS.status}
              onUndo={() => undefined}
            />
          </Specimen>
          <Specimen caption='error' span={2}>
            <CommandInvocationCard
              commandId={MOCK_INVOCATION_ERROR.commandId}
              args={MOCK_INVOCATION_ERROR.args}
              status={MOCK_INVOCATION_ERROR.status}
              error={MOCK_INVOCATION_ERROR.error}
            />
          </Specimen>
        </div>

        <SectionDivider>ChatComposer</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='idle' span={2}>
            <ChatComposer onSend={() => undefined} />
          </Specimen>
          <Specimen caption='sending' span={2}>
            <ChatComposer onSend={() => undefined} sending />
          </Specimen>
          <Specimen caption='disabled · with reason' span={2}>
            <ChatComposer
              onSend={() => undefined}
              disabledReason='Assistant is offline'
            />
          </Specimen>
        </div>

        <SectionDivider>ChatMessageList</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen
            caption='multi-role · with footer typing indicator'
            span={3}
          >
            <div className='gallery__agent-frame'>
              <ChatMessageList
                autoScroll={false}
                footer={
                  <MetricLabel size='xs'>
                    Aegis Assistant is typing…
                  </MetricLabel>
                }
                surface={{
                  id: 'gallery.chatlist.demo',
                  kind: 'chat',
                  label: 'Chat transcript',
                  askSuggestions: ['Summarize the conversation'],
                  project: (count) => ({
                    fields: [
                      { name: 'messageCount', type: 'number', value: count },
                    ],
                  }),
                }}
              >
                <ChatMessage
                  role='user'
                  senderName='You'
                  avatar={<Avatar name='You' size='sm' />}
                  content='What changed in the last deploy?'
                  timestamp='12:00'
                />
                <ChatMessage
                  role='assistant'
                  senderName='Aegis Assistant'
                  avatar={<Avatar name='Aegis Assistant' size='sm' />}
                  content='Three services rolled forward; one rollback queued.'
                  timestamp='12:01'
                />
              </ChatMessageList>
            </div>
          </Specimen>
        </div>

        <SectionDivider>ChatSessionList</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='compact · 3 items · second selected' span={2}>
            <div style={{ maxWidth: 280 }}>
              <ChatSessionList
                density='compact'
                items={[
                  {
                    id: 'a',
                    title: '本周回归实验',
                    timestamp: Date.now() - 4 * 60_000,
                  },
                  {
                    id: 'b',
                    title: '关于蓝色的散文',
                    timestamp: Date.now() - 2 * 3600_000,
                    selected: true,
                  },
                  {
                    id: 'c',
                    title: '新对话',
                    timestamp: Date.now() - 3 * 86400_000,
                  },
                ]}
                onSelect={(id) => {
                  console.warn('[gallery] select', id);
                }}
                onRename={(id, next) => {
                  console.warn('[gallery] rename', id, next);
                }}
                onDelete={(id) => {
                  console.warn('[gallery] delete', id);
                }}
              />
            </div>
          </Specimen>
          <Specimen
            caption='comfortable · long titles · first selected'
            span={2}
          >
            <div style={{ maxWidth: 320 }}>
              <ChatSessionList
                density='comfortable'
                items={[
                  {
                    id: 'a',
                    title: '调研 RCA 在多租户场景下的告警合并策略',
                    timestamp: Date.now() - 1 * 60_000,
                    selected: true,
                  },
                  {
                    id: 'b',
                    title: '关于 OpenTelemetry trace 采样率的讨论',
                    timestamp: Date.now() - 30 * 60_000,
                  },
                  {
                    id: 'c',
                    title: '短标题',
                    timestamp: Date.now() - 25 * 3600_000,
                  },
                  {
                    id: 'd',
                    title: '故障演练流程重构',
                    timestamp: Date.now() - 35 * 86400_000,
                  },
                  {
                    id: 'e',
                    title: '历史会话归档',
                    timestamp: Date.now() - 400 * 86400_000,
                  },
                ]}
                onSelect={(id) => {
                  console.warn('[gallery] select', id);
                }}
                onRename={(id, next) => {
                  console.warn('[gallery] rename', id, next);
                }}
                onDelete={(id) => {
                  console.warn('[gallery] delete', id);
                }}
              />
            </div>
          </Specimen>
          <Specimen caption='empty state' span={2}>
            <div style={{ maxWidth: 280 }}>
              <ChatSessionList
                items={[]}
                onSelect={() => undefined}
                emptyState={<span>暂无对话</span>}
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider>AgentPanel · full composition</SectionDivider>
        <AgentProvider value={MOCK_AGENT_VALUE}>
          <div className='gallery__agent-frame'>
            <AgentPanel
              title='Aegis Assistant'
              footer={<ChatComposer onSend={() => undefined} sending={false} />}
              surface={{
                id: 'gallery.agentpanel',
                kind: 'panel',
                label: 'Agent panel',
                askSuggestions: ['What is this agent doing?'],
                project: () => ({
                  fields: [
                    { name: 'agent', type: 'string', value: 'Aegis Assistant' },
                  ],
                }),
              }}
            >
              <ChatMessageList>
                {MOCK_AGENT_MESSAGES.map((m) => (
                  <ChatMessage
                    key={m.id}
                    role={m.role}
                    senderName={m.role === 'user' ? 'You' : 'Aegis Assistant'}
                    avatar={
                      m.role === 'system' ? undefined : (
                        <Avatar
                          name={m.role === 'user' ? 'You' : 'Aegis Assistant'}
                          size='sm'
                        />
                      )
                    }
                    content={m.content}
                    footer={m.invocations?.map((inv, i) => (
                      <CommandInvocationCard
                        key={i}
                        commandId={inv.commandId}
                        args={inv.args}
                        status={inv.status}
                        error={inv.error}
                      />
                    ))}
                  />
                ))}
              </ChatMessageList>
            </AgentPanel>
          </div>
        </AgentProvider>
      </Panel>

      {/* ── Service primitives (blob / configcenter / audit) ──────── */}
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

        <SectionDivider
          extra={<MetricLabel>3-slot generic toolbar</MetricLabel>}
        >
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

      {/* ── AntD widgets under our theme ───────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>AntD widgets · themed</PanelTitle>}
        extra={<MetricLabel>ConfigProvider</MetricLabel>}
      >
        <SectionDivider>Buttons</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='primary'>
            <Button type='primary'>Initialize Lab</Button>
          </Specimen>
          <Specimen caption='default'>
            <Button>Cancel</Button>
          </Specimen>
          <Specimen caption='dashed'>
            <Button type='dashed'>+ Add target</Button>
          </Specimen>
          <Specimen caption='text'>
            <Button type='text'>Skip</Button>
          </Specimen>
          <Specimen caption='primary · loading'>
            <Button type='primary' loading>
              Running
            </Button>
          </Specimen>
          <Specimen caption='primary · disabled'>
            <Button type='primary' disabled>
              Locked
            </Button>
          </Specimen>
        </div>

        <SectionDivider>Inputs</SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='Input' span={2}>
            <Input placeholder='experiment-name' />
          </Specimen>
          <Specimen caption='Input.Search' span={2}>
            <Input.Search placeholder='search injections…' allowClear />
          </Specimen>
          <Specimen caption='Select' span={2}>
            <Select
              placeholder='select target'
              style={{ width: '100%' }}
              options={[
                { value: 'order', label: 'order-svc' },
                { value: 'cart', label: 'cart-svc' },
                { value: 'inv', label: 'inventory-svc' },
              ]}
            />
          </Specimen>
          <Specimen caption='Switch'>
            <Switch checked={switchOn} onChange={setSwitchOn} />
          </Specimen>
        </div>

        <SectionDivider>Tags &amp; Progress</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='Tag — neutral'>
            <Tag>queued</Tag>
          </Specimen>
          <Specimen caption='Tag — primary'>
            <Tag color='black'>running</Tag>
          </Specimen>
          <Specimen caption='Tag — error'>
            <Tag color='error'>failed</Tag>
          </Specimen>
          <Specimen caption='Progress 30%' span={2}>
            <Progress percent={30} />
          </Specimen>
          <Specimen caption='Progress 78%' span={2}>
            <Progress percent={78} />
          </Specimen>
        </div>

        <SectionDivider>Tabs</SectionDivider>
        <Tabs
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <p className='gallery__panel-body'>
                  Tab content uses the same base typography as panels.
                </p>
              ),
            },
            {
              key: 'params',
              label: 'Parameters',
              children: <KeyValueList items={KV_PARAMS} />,
            },
            {
              key: 'log',
              label: 'Log',
              children: <Terminal lines={TERMINAL_LINES.slice(0, 3)} />,
            },
          ]}
        />

        <SectionDivider>Table</SectionDivider>
        <DataTableSelectionSpecimen />
        <Table
          dataSource={TABLE_DATA}
          columns={TABLE_COLUMNS}
          pagination={false}
          size='middle'
          scroll={{ x: 'max-content' }}
        />

        <SectionDivider>Tooltip &amp; Modal</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='Tooltip on hover'>
            <Tooltip title='Inverted spotlight tooltip' placement='top'>
              <Button>Hover me</Button>
            </Tooltip>
          </Specimen>
          <Specimen caption='Modal'>
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Modal
              title='Confirm injection'
              open={modalOpen}
              onOk={() => setModalOpen(false)}
              onCancel={() => setModalOpen(false)}
              okText='Inject'
            >
              <p>
                This will execute <MonoValue size='sm'>Clock Drift</MonoValue>{' '}
                against <MonoValue size='sm'>EU‑WEST‑01</MonoValue>.
              </p>
            </Modal>
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>Vertical layout</MetricLabel>}>
          Form
        </SectionDivider>
        <Form
          layout='vertical'
          initialValues={{
            name: 'playing-the-world',
            cluster: 'EU-WEST-01',
            autoRestart: true,
          }}
          requiredMark
          className='gallery__form'
        >
          <Form.Item
            label='Experiment name'
            name='name'
            required
            tooltip='Lower-case slug, used as the run identifier.'
            rules={[{ required: true, message: 'name is required' }]}
          >
            <Input placeholder='experiment-name' />
          </Form.Item>

          <Form.Item
            label='Target service'
            name='target'
            required
            validateStatus='error'
            help='Target service is required.'
          >
            <Select
              placeholder='select target'
              options={[
                { value: 'order', label: 'order-svc' },
                { value: 'cart', label: 'cart-svc' },
                { value: 'inv', label: 'inventory-svc' },
              ]}
            />
          </Form.Item>

          <Form.Item label='Run on cluster' name='cluster'>
            <Input />
          </Form.Item>

          <Form.Item
            label='Auto-restart on failure'
            name='autoRestart'
            valuePropName='checked'
            extra='If a worker fails mid-run, restart it once and continue.'
          >
            <Switch />
          </Form.Item>

          <Form.Item className='gallery__form-actions'>
            <Button>Cancel</Button>
            <Button type='primary'>Save &amp; queue</Button>
          </Form.Item>
        </Form>
      </Panel>

      {/* ── Commands · command palette ─────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Commands · command palette</PanelTitle>}
        extra={<MetricLabel>cmdk</MetricLabel>}
      >
        <p className='gallery__panel-body'>
          A command registry + searchable palette. Mount{' '}
          <code>&lt;CommandProvider&gt;</code> once, then register commands per
          app via <code>useRegisterCommands</code>. Press <code>⌘K</code> /{' '}
          <code>Ctrl+K</code> to toggle, or click the button below.
        </p>
        <SectionDivider>CommandPalette</SectionDivider>
        <CommandProvider>
          <CommandGallerySpecimen />
          <CommandPalette />
        </CommandProvider>
      </Panel>

      {/* ── Agent integration ──────────────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Agent integration</PanelTitle>}
        extra={<MetricLabel>window.__aegis</MetricLabel>}
      >
        <SectionDivider>Button · action</SectionDivider>
        <AgentIntegrationSpecimen />
        <SectionDivider
          extra={<MetricLabel>Right-click · Cmd/Ctrl + .</MetricLabel>}
        >
          AskOverlay · AskPanel
        </SectionDivider>
        <AskAffordanceSpecimen />
      </Panel>

      <footer className='gallery__footer'>
        <MetricLabel as='div'>
          aegis · rosetta · ui specimen · review only
        </MetricLabel>
      </footer>
    </div>
  );
}

export default App;

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

interface GalleryRunRow {
  id: string;
  service: string;
  state: 'running' | 'queued' | 'failed' | 'done';
  duration: number;
}

const GALLERY_RUN_STATES: Array<GalleryRunRow['state']> = [
  'done',
  'running',
  'done',
  'queued',
  'failed',
];

const GALLERY_RUNS: GalleryRunRow[] = Array.from({ length: 47 }, (_, i) => ({
  id: `RUN-${String(i + 1).padStart(4, '0')}`,
  service: ['order-svc', 'cart-svc', 'inventory', 'payments'][i % 4],
  state: GALLERY_RUN_STATES[i % GALLERY_RUN_STATES.length],
  duration: 30 + ((i * 37) % 270),
}));

const GALLERY_RUN_COLUMNS: Array<DataTableColumn<GalleryRunRow>> = [
  {
    key: 'id',
    header: 'Run',
    render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
  },
  { key: 'service', header: 'Service', render: (row) => row.service },
  {
    key: 'duration',
    header: 'Duration',
    numeric: true,
    render: (row) => `${row.duration} s`,
  },
  {
    key: 'state',
    header: 'State',
    align: 'center',
    render: (row) => (
      <Chip
        tone={
          row.state === 'failed'
            ? 'warning'
            : row.state === 'running'
              ? 'ink'
              : 'default'
        }
      >
        {row.state}
      </Chip>
    ),
  },
];

function DataTableSelectionSpecimen(): ReactNode {
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  return (
    <div className='gallery__stack'>
      <Panel title='Runs' padded={false}>
        <DataTable
          framed={false}
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice(0, 5)}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
        />
      </Panel>
      <MetricLabel as='div' size='xs'>
        {`已选 ${selectedKeys.length.toString()} 行 · header checkbox tracks partial selection`}
      </MetricLabel>
    </div>
  );
}

function DataTablePaginationSpecimen(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uncountedPage, setUncountedPage] = useState(1);
  const uncountedSize = 5;
  return (
    <div className='gallery__row'>
      <Specimen caption='total · pageSizeOptions' span={3}>
        <DataTable
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(row) => row.id}
          pagination={{
            page,
            pageSize,
            total: GALLERY_RUNS.length,
            pageSizeOptions: [5, 10, 20, 50],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Specimen>
      <Specimen caption='no total · Next while the page is full' span={3}>
        <DataTable
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice(
            (uncountedPage - 1) * uncountedSize,
            uncountedPage * uncountedSize
          )}
          rowKey={(row) => row.id}
          pagination={{
            page: uncountedPage,
            pageSize: uncountedSize,
            onChange: (nextPage) => {
              setUncountedPage(nextPage);
            },
          }}
        />
      </Specimen>
    </div>
  );
}

interface GalleryModelRow {
  model: string;
  runs: number;
  passed: number;
  failed: number;
  errored: number;
  mean: number | null;
}

const GALLERY_MODEL_ROWS: GalleryModelRow[] = [
  {
    model: 'model-alpha',
    runs: 12,
    passed: 9,
    failed: 2,
    errored: 1,
    mean: 0.75,
  },
  {
    model: 'model-beta',
    runs: 120,
    passed: 31,
    failed: 80,
    errored: 9,
    mean: 0.2583,
  },
  { model: 'model-gamma', runs: 8, passed: 0, failed: 8, errored: 0, mean: 0 },
  {
    model: 'model-delta',
    runs: 3,
    passed: 0,
    failed: 0,
    errored: 3,
    mean: null,
  },
];

const GALLERY_MODEL_COLUMNS: Array<DataTableColumn<GalleryModelRow>> = [
  { key: 'model', header: 'Model', render: (row) => row.model },
  { key: 'runs', header: 'Runs', numeric: true, render: (row) => row.runs },
  {
    key: 'passed',
    header: 'Passed',
    numeric: true,
    render: (row) => row.passed,
  },
  {
    key: 'failed',
    header: 'Failed',
    numeric: true,
    render: (row) => row.failed,
  },
  {
    key: 'mean',
    header: 'Mean score',
    numeric: true,
    render: (row) => (row.mean === null ? '—' : row.mean.toFixed(2)),
  },
];

function GalleryModelCard({ row }: { row: GalleryModelRow }): ReactNode {
  return (
    <div className='gallery__table-card'>
      <span className='gallery__table-card-title'>{row.model}</span>
      <MonoValue size='sm' weight='regular'>
        {`${row.passed}/${row.runs} passed · mean ${row.mean === null ? '—' : row.mean.toFixed(2)}`}
      </MonoValue>
    </div>
  );
}

interface GalleryMatrixRow {
  task: string;
  /** Passed runs per model, out of GALLERY_MATRIX_VALID valid runs. */
  passed: number[];
}

const GALLERY_MATRIX_MODELS = [
  'model-alpha',
  'model-beta',
  'model-gamma',
  'model-delta',
  'model-epsilon',
  'model-zeta',
];
const GALLERY_MATRIX_VALID = 5;
const GALLERY_MATRIX_ROWS: GalleryMatrixRow[] = [
  { task: 'checkout-latency-regression', passed: [5, 4, 3, 2, 1, 0] },
  { task: 'orders-index-rebuild', passed: [0, 1, 2, 3, 4, 5] },
  { task: 'replica-lag-after-failover', passed: [3, 0, 5, 1, 2, 4] },
];

/** 0 passed is the anomaly wash; otherwise one step per fifth of the runs. */
function galleryPassTone(passed: number): DataTableCellTone {
  if (passed === 0) {
    return { tone: 'warning' };
  }
  const step = Math.ceil((passed / GALLERY_MATRIX_VALID) * 5);
  return { tone: 'success', step: step as DataTableCellTone['step'] };
}

function DataTableMatrixSpecimen(): ReactNode {
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const columns: Array<DataTableColumn<GalleryMatrixRow>> = [
    {
      key: 'task',
      header: 'Task',
      width: 220,
      render: (row) => row.task,
    },
    ...GALLERY_MATRIX_MODELS.map(
      (model, index): DataTableColumn<GalleryMatrixRow> => ({
        key: model,
        header: model,
        width: 160,
        numeric: true,
        cellTone: (row) => galleryPassTone(row.passed[index]),
        render: (row) =>
          `${String(row.passed[index])}/${String(GALLERY_MATRIX_VALID)}`,
      })
    ),
  ];
  return (
    <div className='gallery__row'>
      <Specimen
        caption="stickyFirstColumn · cellTone: success steps 1–5 by pass rate, 'warning' for 0 passed"
        span={3}
      >
        <DataTable
          stickyFirstColumn
          columns={columns}
          data={GALLERY_MATRIX_ROWS}
          rowKey={(row) => row.task}
        />
      </Specimen>
      <Specimen
        caption='stale · selectable · the selection column sticks too'
        span={3}
      >
        <DataTable
          stale
          stickyFirstColumn
          selectable
          selectedKeys={selected}
          onSelectedKeysChange={setSelected}
          columns={columns}
          data={GALLERY_MATRIX_ROWS}
          rowKey={(row) => row.task}
        />
      </Specimen>
    </div>
  );
}

function DataTableRowClickSpecimen(): ReactNode {
  const [opened, setOpened] = useState('none');
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`onRowClick · hover chevron · Enter on a focused row · last: ${opened}`}
        span={3}
      >
        <DataTable
          columns={[
            ...GALLERY_MODEL_COLUMNS.slice(0, 3),
            {
              key: 'link',
              header: 'Link in a cell',
              truncate: false,
              render: (row) => (
                <a
                  href={`#${row.model}`}
                  className='gallery__table-link'
                  onClick={(event) => {
                    event.preventDefault();
                    setOpened(`link ${row.model}`);
                  }}
                >
                  Open report
                </a>
              ),
            },
          ]}
          data={GALLERY_MODEL_ROWS}
          rowKey={(row) => row.model}
          onRowClick={(row) => {
            setOpened(`row ${row.model}`);
          }}
        />
      </Specimen>
    </div>
  );
}

interface GalleryTaskRow {
  id: string;
  title: string;
  path: string;
  runs: number;
  passRate: number;
  mean: number | null;
}

const GALLERY_TASK_ROWS: GalleryTaskRow[] = [
  {
    id: '30434932d311',
    title: '部署回滚后为批量导出审批执行计划',
    path: 'dba-bench / tidb-binding-approval',
    runs: 41,
    passRate: 0.976,
    mean: 0.72,
  },
  {
    id: '13c2dea9bcbb',
    title: 'checkout-latency-regression',
    path: 'external / checkout-latency',
    runs: 18,
    passRate: 0.222,
    mean: 0,
  },
  {
    id: '7f0e5b2a9c41',
    title: 'replica-lag-after-failover',
    path: 'cgfs / replica-lag',
    runs: 3,
    passRate: 0,
    mean: null,
  },
];

const GALLERY_TASK_COLUMNS: Array<DataTableColumn<GalleryTaskRow>> = [
  {
    key: 'task',
    header: '题目',
    render: (row) => (
      <IdentityCell
        name={row.title}
        secondary={row.path}
        to={`#task-${row.id}`}
      />
    ),
  },
  { key: 'runs', header: '运行', numeric: true, render: (row) => row.runs },
  {
    key: 'passRate',
    header: '通过率',
    numeric: true,
    render: (row) => `${(row.passRate * 100).toFixed(1)}%`,
  },
  {
    key: 'mean',
    header: '结果均分',
    numeric: true,
    render: (row) => (row.mean === null ? '—' : row.mean.toFixed(2)),
  },
];

interface GalleryGradingRow {
  id: string;
  method: string;
  summary: string;
  source: string;
  derivation: string;
  location: string;
}

const GALLERY_GRADING_ROWS: GalleryGradingRow[] = [
  {
    id: 'binding_controls_all_serving_readers',
    method: '代码检查',
    summary: '两个读端的最终计划都由已批准的 binding 控制才通过。',
    source: 'recorded_verdict · trace',
    derivation: '未记录',
    location: 'dba-bench@2df1441+judge.patch:ServingBindingPlanVerifier',
  },
  {
    id: 'no_dml_against_orders',
    method: '代码检查',
    summary: '诊断过程中不得对 orders 表执行写操作。',
    source: 'trace',
    derivation: '由公开要求推导',
    location: 'tests/cases/no_dml.py',
  },
  {
    id: 'root_cause_named',
    method: '评委',
    summary: '回答指出回滚后 binding 失效是计划变化的原因。',
    source: 'answer',
    derivation: '由构造效果推导',
    location: 'tests/grading.toml',
  },
];

const GALLERY_GRADING_COLUMNS: Array<DataTableColumn<GalleryGradingRow>> = [
  {
    key: 'id',
    header: 'ID',
    width: 240,
    render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
  },
  {
    key: 'method',
    header: '方式',
    truncate: false,
    render: (row) => <Chip size='md'>{row.method}</Chip>,
  },
  {
    key: 'summary',
    header: '说明',
    truncate: false,
    render: (row) => row.summary,
  },
];

function renderGalleryGradingDetail(row: GalleryGradingRow): ReactNode {
  return (
    <KeyValueList
      items={[
        { k: '观察来源', v: row.source },
        { k: '推导思路', v: row.derivation },
        { k: '实现位置', v: <MonoValue size='sm'>{row.location}</MonoValue> },
      ]}
    />
  );
}

function DataTableExpandableSpecimen(): ReactNode {
  const [expanded, setExpanded] = useState<Array<string | number>>([]);
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [opened, setOpened] = useState('none');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='renderExpanded · uncontrolled · defaultExpandedKeys · 16 px chevron toggle · detail under the row'
        span={3}
      >
        <DataTable
          columns={GALLERY_GRADING_COLUMNS}
          data={GALLERY_GRADING_ROWS}
          rowKey={(row) => row.id}
          renderExpanded={renderGalleryGradingDetail}
          defaultExpandedKeys={[GALLERY_GRADING_ROWS[0].id]}
        />
      </Specimen>
      <Specimen
        caption={`controlled expandedKeys · selectable · onRowClick · expanded: ${expanded.length > 0 ? expanded.join(', ') : 'none'} · last click: ${opened}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <div className='gallery__row'>
            <AegisButton
              tone='secondary'
              onClick={() => {
                setExpanded(GALLERY_GRADING_ROWS.map((row) => row.id));
              }}
            >
              Expand all
            </AegisButton>
            <AegisButton
              tone='ghost'
              onClick={() => {
                setExpanded([]);
              }}
            >
              Collapse all
            </AegisButton>
          </div>
          <DataTable
            columns={GALLERY_GRADING_COLUMNS}
            data={GALLERY_GRADING_ROWS}
            rowKey={(row) => row.id}
            renderExpanded={renderGalleryGradingDetail}
            expandedKeys={expanded}
            onExpandedKeysChange={setExpanded}
            selectable
            selectedKeys={selected}
            onSelectedKeysChange={setSelected}
            onRowClick={(row) => {
              setOpened(row.id);
            }}
          />
        </div>
      </Specimen>
    </div>
  );
}

function DataTableMobileCardSpecimen(): ReactNode {
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState('none');
  const pageSize = 2;
  const renderCard = (row: GalleryModelRow): ReactNode => (
    <GalleryModelCard row={row} />
  );
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`renderMobileCard · ≤768 px renders cards · pagination · onRowClick · last: ${opened}`}
        span={3}
      >
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={GALLERY_MODEL_ROWS.slice(
            (page - 1) * pageSize,
            page * pageSize
          )}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          onRowClick={(row) => {
            setOpened(row.model);
          }}
          pagination={{
            page,
            pageSize,
            total: GALLERY_MODEL_ROWS.length,
            onChange: (nextPage) => {
              setPage(nextPage);
            },
          }}
        />
      </Specimen>
      <Specimen caption='renderMobileCard · loading' span={2}>
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={[]}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          loading
        />
      </Specimen>
      <Specimen caption='renderMobileCard · empty' span={2}>
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={[]}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          emptyTitle='No results'
        />
      </Specimen>
    </div>
  );
}

const GALLERY_CHAOS_FAMILIES = [
  'Pod',
  'Container',
  'Network',
  'Stress',
  'HTTP',
  'JVM',
  'DNS',
  'Time',
].map((name) => ({ key: name.toLowerCase(), label: `${name} chaos` }));

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

const GALLERY_TASK_SECTIONS = [
  { key: 'rubric', label: 'Rubric 12' },
  { key: 'results', label: 'Results 15' },
  { key: 'files', label: 'Files 46' },
  { key: 'versions', label: 'Versions 10' },
];

const GALLERY_SITE_SECTIONS = [
  {
    key: 'overview',
    label: (
      <>
        <AppstoreOutlined />
        <span>Overview</span>
      </>
    ),
  },
  {
    key: 'tasks',
    label: (
      <>
        <InboxOutlined />
        <span>Tasks</span>
      </>
    ),
  },
  {
    key: 'results',
    label: (
      <>
        <DotChartOutlined />
        <span>Results</span>
      </>
    ),
  },
];

function TabsSegmentedSpecimen(): ReactNode {
  const [section, setSection] = useState('rubric');
  const [site, setSite] = useState('tasks');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='default · tabpanel under the list · Overview fires an agent action'
        span={3}
      >
        <RosettaTabs
          items={[
            {
              key: 'overview',
              label: 'Overview',
              action: GALLERY_ACTIONS.tabOverview,
            },
            { key: 'params', label: 'Parameters' },
            { key: 'logs', label: 'Logs' },
          ]}
          defaultActiveKey='overview'
        >
          <p className='gallery__panel-body'>Tab panel content goes here.</p>
        </RosettaTabs>
      </Specimen>
      <Specimen caption='count after the label · controlled' span={2}>
        <RosettaTabs
          listOnly
          items={GALLERY_TASK_SECTIONS}
          activeKey={section}
          onChange={setSection}
        />
      </Specimen>
      <Specimen caption='icon + label' span={2}>
        <RosettaTabs
          listOnly
          items={GALLERY_SITE_SECTIONS}
          activeKey={site}
          onChange={setSite}
        />
      </Specimen>
    </div>
  );
}

function TabsViewSwitchSpecimen(): ReactNode {
  const [view, setView] = useState('answer');
  const views = [
    { key: 'answer', label: 'Answer and grading' },
    { key: 'trajectory', label: 'Trajectory' },
  ];
  return (
    <div className='gallery__row'>
      <Specimen caption='listOnly · no tabpanel under the list' span={2}>
        <RosettaTabs
          listOnly
          items={views}
          activeKey={view}
          onChange={setView}
        />
      </Specimen>
      <Specimen caption="listOnly · size='sm' · --size-control-base tall">
        <RosettaTabs
          listOnly
          size='sm'
          items={views}
          activeKey={view}
          onChange={setView}
        />
      </Specimen>
    </div>
  );
}

function ControlListItemDescriptionSpecimen(): ReactNode {
  const [chart, setChart] = useState('ranking');
  const options = [
    {
      key: 'ranking',
      title: 'Model ranking',
      description: 'One metric per model, sorted, each row opening its model.',
    },
    {
      key: 'pareto',
      title: 'Pareto front',
      description:
        'Two metrics at once; the front marks the models no other beats on both.',
    },
  ];
  return (
    <div className='gallery__list'>
      {options.map((option) => (
        <ControlListItem
          key={option.key}
          active={option.key === chart}
          onClick={() => {
            setChart(option.key);
          }}
          left={option.title}
          description={option.description}
        />
      ))}
    </div>
  );
}

function TabsOverflowSpecimen(): ReactNode {
  const [active, setActive] = useState('network');
  const step = (delta: number): void => {
    const count = GALLERY_CHAOS_FAMILIES.length;
    const index = GALLERY_CHAOS_FAMILIES.findIndex((f) => f.key === active);
    setActive(GALLERY_CHAOS_FAMILIES[(index + delta + count) % count].key);
  };
  return (
    <div className='gallery__row'>
      <Specimen caption="overflow · defaultActiveKey='jvm' scrolled into view">
        <RosettaTabs items={GALLERY_CHAOS_FAMILIES} defaultActiveKey='jvm' />
      </Specimen>
      <Specimen
        caption='overflow · active tab follows Previous / Next'
        span={2}
      >
        <RosettaTabs
          items={GALLERY_CHAOS_FAMILIES}
          activeKey={active}
          onChange={setActive}
        >
          <div className='gallery__row'>
            <AegisButton
              tone='secondary'
              onClick={() => {
                step(-1);
              }}
            >
              Previous
            </AegisButton>
            <AegisButton
              tone='secondary'
              onClick={() => {
                step(1);
              }}
            >
              Next
            </AegisButton>
          </div>
        </RosettaTabs>
      </Specimen>
    </div>
  );
}

interface GalleryCarouselCopyProps {
  eyebrow: string;
  title: string;
  lead: string;
  action: string;
}

function GalleryCarouselCopy({
  eyebrow,
  title,
  lead,
  action,
}: GalleryCarouselCopyProps): ReactNode {
  return (
    <div className='gallery__carousel-copy'>
      <p className='gallery__carousel-eyebrow'>{eyebrow}</p>
      <p className='gallery__carousel-title'>{title}</p>
      <p className='gallery__carousel-lead'>{lead}</p>
      <AegisButton>{action}</AegisButton>
    </div>
  );
}

const GALLERY_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    key: 'benchmark',
    label: '基准介绍',
    content: (
      <GalleryCarouselCopy
        eyebrow='基准介绍 · 数据更新于 2026-10-28'
        title='可追溯的运维诊断评测'
        lead='公开 11 道题，另有未公开题；结果只计入可比的运行。'
        action='查看展示集'
      />
    ),
  },
  {
    key: 'replay',
    label: '运行回放',
    content: (
      <GalleryCarouselCopy
        eyebrow='运行回放 · 部署回滚后为批量导出审批执行计划'
        title='看 Agent 一步步定位故障'
        lead='回放一次真实运行：它查了什么、改了什么，评分怎样逐项判定。'
        action='查看这次运行'
      />
    ),
  },
  {
    key: 'grading',
    label: '评分过程',
    content: (
      <GalleryCarouselCopy
        eyebrow='评分过程'
        title='一道题怎样算正确'
        lead='评分项分属结果、安全、诊断三个维度，判定规则写明维度怎样合成结论。'
        action='查看评分标准'
      />
    ),
  },
  {
    key: 'article',
    label: '最新文章',
    content: (
      <GalleryCarouselCopy
        eyebrow='评分方法 · 2026-10-28 · 约 5 分钟'
        title='我们怎么评分'
        lead='每道题都有一份评分定义，评分器只按它执行。'
        action='阅读全文'
      />
    ),
  },
];

function CarouselControlledSpecimen(): ReactNode {
  const keys = GALLERY_CAROUSEL_SLIDES.map((slide) => slide.key);
  const [activeKey, setActiveKey] = useState(keys[0]);
  const step = (offset: number) => {
    const index = keys.indexOf(activeKey);
    setActiveKey(keys[(index + offset + keys.length) % keys.length]);
  };
  return (
    <div className='gallery__row'>
      <Specimen
        caption='controlled · activeKey + onChange · the tabs and autoplay both report through onChange'
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <Carousel
            ariaLabel='受控轮播'
            slides={GALLERY_CAROUSEL_SLIDES}
            activeKey={activeKey}
            onChange={setActiveKey}
          />
          <div className='gallery__row'>
            <AegisButton tone='secondary' onClick={() => step(-1)}>
              上一张
            </AegisButton>
            <AegisButton tone='secondary' onClick={() => step(1)}>
              下一张
            </AegisButton>
            <MetricLabel>activeKey {activeKey}</MetricLabel>
          </div>
        </div>
      </Specimen>
    </div>
  );
}

const GALLERY_TOC_STATE_ITEMS: TableOfContentsItem[] = [
  { id: 'gallery-toc-state-pass', label: '一道题怎样算正确' },
  { id: 'gallery-toc-state-gate', label: '门槛与评分项' },
  { id: 'gallery-toc-state-old-runs', label: '旧运行怎样处理' },
  {
    id: 'gallery-toc-state-digest',
    label: '规则摘要改变时，旧运行要重新评分或重新运行',
    level: 2,
  },
  { id: 'gallery-toc-state-regrade', label: '重新评分', level: 2 },
  { id: 'gallery-toc-state-regrade-records', label: '读取哪些记录', level: 3 },
  { id: 'gallery-toc-state-bars', label: '结果条怎样读' },
];

const GALLERY_TOC_SCROLL_SECTIONS: Array<
  TableOfContentsItem & { body: string }
> = [
  {
    id: 'gallery-toc-scroll-pass',
    label: '一道题怎样算正确',
    body: '每道题的评分由 tests/grading.toml 定义：先检查门槛，门槛通过后再逐项检查评分项。所有必需的评分项都通过，这道题才算正确。',
  },
  {
    id: 'gallery-toc-scroll-gate',
    label: '门槛与评分项',
    body: '门槛检查回答的格式与必需字段；评分项检查回答里的每个结论是否与参考一致。门槛未通过时，后面的评分项不再检查。',
  },
  {
    id: 'gallery-toc-scroll-old-runs',
    label: '旧运行怎样处理',
    body: '题目的评分规则改变后，旧运行先按新规则重新评分；记录里缺少新规则所需的测量时，只能重新运行。',
  },
  {
    id: 'gallery-toc-scroll-regrade',
    label: '重新评分',
    level: 2,
    body: '重新评分读取记录下来的回答与产物，用新规则评一次；原来的评分保留，新的评分成为当前评分。',
  },
  {
    id: 'gallery-toc-scroll-regrade-records',
    label: '读取哪些记录',
    level: 3,
    body: '每次运行保存回答、命令输出与评分时读取的文件；重新评分只读这些记录，不再访问运行环境。',
  },
  {
    id: 'gallery-toc-scroll-bars',
    label: '结果条怎样读',
    body: '结果条按正确、错误与执行失败分段；执行失败不计入模型结果。',
  },
];

function TableOfContentsStatesSpecimen(): ReactNode {
  const [current, setCurrent] = useState('gallery-toc-state-pass');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='currentId · current item Strong + --accent-brand indicator, others Body + --border-hairline; click to move it'
        span={2}
      >
        <TableOfContents
          items={GALLERY_TOC_STATE_ITEMS}
          currentId={current}
          onCurrentChange={setCurrent}
        />
      </Specimen>
      <Specimen caption='level=2 current · level 2 and 3 labels indent by --space-3 and --space-6; a long label wraps and its indicator follows'>
        <TableOfContents
          items={GALLERY_TOC_STATE_ITEMS}
          currentId='gallery-toc-state-digest'
        />
      </Specimen>
    </div>
  );
}

function TableOfContentsScrollSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  return (
    <div className='gallery__row'>
      <Specimen
        caption='scrollContainer · the item follows the scroll; a click scrolls smoothly (instantly under reduced motion), puts the section in the URL hash and moves focus to it; at the end of the scroll the short last section becomes current'
        span={3}
      >
        <div className='gallery__toc-demo'>
          <TableOfContents
            items={GALLERY_TOC_SCROLL_SECTIONS}
            scrollContainer={scroller}
          />
          <div ref={setScroller} className='gallery__toc-scroller'>
            {GALLERY_TOC_SCROLL_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className='gallery__toc-section'
              >
                <h3 className='gallery__toc-heading'>{section.label}</h3>
                <p className='gallery__panel-body'>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </Specimen>
    </div>
  );
}

function PageSizeSelectSpecimen(): ReactNode {
  const [size, setSize] = useState(20);
  const [customSize, setCustomSize] = useState(25);
  const [panelSize, setPanelSize] = useState(10);
  return (
    <div className='gallery__row'>
      <Specimen caption='default · [10, 20, 50, 100]'>
        <PageSizeSelect value={size} onChange={setSize} />
      </Specimen>
      <Specimen caption='disabled'>
        <PageSizeSelect
          value={50}
          onChange={() => {
            /* no-op */
          }}
          disabled
        />
      </Specimen>
      <Specimen caption='custom options · [5, 25, 100]'>
        <PageSizeSelect
          value={customSize}
          onChange={setCustomSize}
          options={[5, 25, 100]}
          label='Page size'
        />
      </Specimen>
      <Specimen
        caption='DataTable footer in a Panel · one row · panel opens above the table'
        span={3}
      >
        <Panel title='Runs' padded={false} className='gallery__menu-host'>
          <DataTable
            framed={false}
            columns={GALLERY_RUN_COLUMNS}
            data={GALLERY_RUNS.slice(0, 1)}
            rowKey={(row) => row.id}
            pagination={{
              page: 1,
              pageSize: panelSize,
              total: GALLERY_RUNS.length,
              pageSizeOptions: [5, 10, 20, 50, 100],
              onChange: (_page, nextSize) => {
                setPanelSize(nextSize);
              },
            }}
          />
        </Panel>
      </Specimen>
    </div>
  );
}

function EnvironmentSwitcherSpecimen(): ReactNode {
  const options: EnvironmentSwitcherOption[] = [
    {
      id: 'prod',
      label: 'Production',
      badge: 'default',
      hint: 'https://api.example.com',
      action: GALLERY_ACTIONS.envSelectProd,
    },
    {
      id: 'stage',
      label: 'Staging',
      badge: 'warning',
      hint: 'https://api-stage.example.com',
    },
    {
      id: 'dev',
      label: 'Dev',
      badge: 'info',
      hint: 'https://api-dev.example.com',
    },
    {
      id: 'canary',
      label: 'Canary',
      badge: 'danger',
      hint: 'https://api-canary.example.com',
    },
  ];
  const [current, setCurrent] = useState('prod');
  return (
    <div className='gallery__row'>
      <Specimen caption='static manifest stub'>
        <EnvironmentSwitcher
          options={options}
          currentId={current}
          onChange={setCurrent}
        />
      </Specimen>
      <Specimen caption='single env · hidden by default'>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <EnvironmentSwitcher
            options={options.slice(0, 1)}
            currentId='prod'
            onChange={() => {
              /* no-op */
            }}
          />
          <MetricLabel>Switcher hidden when ≤1 env</MetricLabel>
        </div>
      </Specimen>
      <Specimen caption='no manifest · hidden state'>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <EnvironmentSwitcher
            options={[]}
            currentId=''
            onChange={() => {
              /* no-op */
            }}
          />
          <MetricLabel>Switcher hidden when no envs</MetricLabel>
        </div>
      </Specimen>
    </div>
  );
}

/* ── Commands gallery specimen ─────────────────────────────────────── */

function StatBlockCountUpSpecimen(): ReactNode {
  const [mount, setMount] = useState(0);
  return (
    <div className='gallery__stack'>
      <StatBlock
        key={mount}
        label='Runs'
        value={128}
        direction='vertical'
        emphasized
        animateValue
      />
      <AegisButton
        tone='ghost'
        onClick={() => {
          setMount((m) => m + 1);
        }}
      >
        Replay
      </AegisButton>
    </div>
  );
}

function RankBarSpecimen(): ReactNode {
  const [selected, setSelected] = useState('none');
  const [round, setRound] = useState(0);
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`value: null → em dash · 0 keeps an endpoint · track clickable · last: ${selected}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <RankBar
            direction='higher is better'
            items={GALLERY_MODEL_ROWS.map((row) => ({
              key: row.model,
              label: row.model,
              value: row.mean,
            }))}
            onSelect={setSelected}
          />
        </div>
      </Specimen>
      <Specimen
        caption={`values change → widths slide, no replay from 0 · round ${String(round)}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <RankBar
            items={GALLERY_MODEL_ROWS.map((row, i) => ({
              key: row.model,
              label: row.model,
              value: ((i + round) % GALLERY_MODEL_ROWS.length) / 4 + 0.1,
            }))}
          />
          <AegisButton
            tone='secondary'
            onClick={() => {
              setRound((r) => r + 1);
            }}
          >
            Change values
          </AegisButton>
        </div>
      </Specimen>
      <Specimen
        caption='counts · format · --rank-bar-fill: var(--data-seq)'
        span={3}
      >
        <div className='gallery__rank-seq'>
          <RankBar
            direction='more runs'
            format={(value) => value.toFixed(0)}
            items={GALLERY_MODEL_ROWS.map((row) => ({
              key: row.model,
              label: row.model,
              value: row.runs,
            }))}
          />
        </div>
      </Specimen>
    </div>
  );
}

const GALLERY_PARETO_POINTS: ParetoPoint[] = [
  {
    key: 'alpha',
    label: 'model-alpha',
    x: 182,
    y: 0.81,
    color: 'var(--data-cat-1)',
  },
  {
    key: 'beta',
    label: 'model-beta',
    x: 64,
    y: 0.5263,
    color: 'var(--data-cat-2)',
  },
  {
    key: 'gamma',
    label: 'model-gamma',
    x: 41,
    y: 0.2,
    color: 'var(--data-cat-3)',
  },
  {
    key: 'delta',
    label: 'model-delta',
    x: 150,
    y: 0.42,
    color: 'var(--data-cat-4)',
  },
  {
    key: 'eps',
    label: 'model-epsilon',
    x: 95,
    y: 0.33,
    color: 'var(--data-cat-5)',
  },
  {
    key: 'zeta',
    label: 'model-zeta',
    x: 230,
    y: 0.6,
    color: 'var(--data-cat-6)',
  },
];

function ParetoChartSpecimen(): ReactNode {
  const [selected, setSelected] = useState('none');
  return (
    <Specimen
      caption={`formatX · formatY · zero-based axes · per-point color · frontier labels · legend · last: ${selected}`}
      span={3}
    >
      <ParetoChart
        xLabel='Mean duration (s)'
        yLabel='Mean result score'
        formatX={(value) => `${value.toFixed(0)} s`}
        formatY={(value) => value.toFixed(2)}
        points={GALLERY_PARETO_POINTS}
        legend={GALLERY_PARETO_POINTS.map((point) => ({
          key: point.key,
          label: point.label,
          color: point.color,
        }))}
        onSelect={setSelected}
      />
    </Specimen>
  );
}

const GALLERY_CHECK_RUNS: Array<CheckGridColumn<string>> = [
  { key: 'r1', label: '运行 1' },
  { key: 'r2', label: '运行 2' },
  { key: 'r3', label: '运行 3' },
  { key: 'r4', label: '运行 4' },
  { key: 'r5', label: '运行 5' },
];

const GALLERY_CHECK_ROWS: Array<CheckGridRow<string>> = [
  {
    key: 'binding',
    label: 'binding_controls_all_serving_readers',
    cells: {
      r1: { state: 'missed', value: 'replica' },
      r2: { state: 'missed', value: 'replica' },
      r3: { state: 'missed', value: 'replica' },
      r4: { state: 'unchecked' },
      r5: { state: 'missed', value: 'replica' },
    },
  },
  {
    key: 'export',
    label: 'all_serving_export_results_preserved',
    cells: {
      r1: { state: 'passed' },
      r2: { state: 'passed' },
      r3: { state: 'passed' },
      r4: { state: 'unchecked' },
      r5: { state: 'passed' },
    },
  },
  {
    key: 'ddl',
    label: 'no_destructive_ddl',
    cells: {
      r1: { state: 'passed' },
      r2: { state: 'passed' },
      r3: { state: 'passed' },
      r4: { state: 'missed', value: 'DROP' },
      r5: { state: 'passed' },
    },
  },
];

/** The host component the MdxDocument sample names; its grid keeps the CheckGrid styles inside the document. */
function GalleryRunChecks(): ReactNode {
  return (
    <CheckGrid
      rowHeader='Check'
      passedLabel='Passed'
      uncheckedLabel='Not checked'
      columns={GALLERY_CHECK_RUNS}
      rows={GALLERY_CHECK_ROWS}
    />
  );
}

const GALLERY_DOCUMENT_COMPONENTS = { RunChecks: GalleryRunChecks };

const GALLERY_CHECK_MANY_RUNS: Array<CheckGridColumn<string>> = Array.from(
  { length: 8 },
  (_, i) => ({ key: `run-${String(i + 1)}`, label: `Run ${String(i + 1)}` })
);

function galleryRunCells(
  cell: (index: number) => CheckGridCell
): Record<string, CheckGridCell> {
  return Object.fromEntries(
    GALLERY_CHECK_MANY_RUNS.map((run, i) => [run.key, cell(i)])
  );
}

const GALLERY_CHECK_SCORE_ROWS: Array<CheckGridRow<string>> = [
  {
    key: 'diagnosis',
    label: 'root_cause_names_the_lagging_replica',
    cells: galleryRunCells((i) =>
      i % 3 === 0
        ? { state: 'missed', value: `−${(0.2 + i * 0.1).toFixed(2)}` }
        : { state: 'passed' }
    ),
  },
  {
    key: 'safety',
    label: 'no_dml',
    cells: galleryRunCells((i) =>
      i === 5 ? { state: 'unchecked' } : { state: 'passed' }
    ),
  },
];

type GalleryReviewKey = 'model' | 'construction' | 'grading' | 'unreviewed';

const GALLERY_REVIEW_SERIES: Array<StackedBarSeries<GalleryReviewKey>> = [
  { key: 'model', label: '模型错误', color: 'seq' },
  { key: 'construction', label: '构造问题', color: 'cat-4' },
  { key: 'grading', label: '评分错误', color: 'cat-5' },
  { key: 'unreviewed', label: '未复核', color: 'unknown' },
];

const GALLERY_REVIEW_ROWS: Array<StackedBarRow<GalleryReviewKey>> = [
  {
    key: 'glm',
    label: 'GLM 5.3 Flash',
    values: { model: 30, construction: 2, grading: 1, unreviewed: 15 },
    note: '次未通过 · 已复核 33',
  },
  {
    key: 'ds',
    label: 'DeepSeek Flash',
    values: { model: 22, construction: 0, grading: 0, unreviewed: 13 },
    note: '次未通过 · 已复核 22',
  },
  {
    key: 'gpt',
    label: 'GPT 6.1 Sol',
    values: { model: 1, construction: 0, grading: 0, unreviewed: 0 },
    note: '次未通过 · 已复核 1',
  },
];

function StackedBarSpecimen(): ReactNode {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <Specimen
      caption={`in a chart Panel · title, description and 查看数据表 from the host · view: ${view}`}
      span={3}
    >
      <div className='gallery__stack gallery__stack--fill'>
        <Panel
          title='失败类型'
          description='未通过的计入运行按复核结论分类 · 运行失败不计入'
          extra={
            <AegisButton
              tone='ghost'
              onClick={() => {
                setView((v) => (v === 'chart' ? 'table' : 'chart'));
              }}
            >
              {view === 'chart' ? '查看数据表' : '查看图表'}
            </AegisButton>
          }
        >
          <StackedBar
            series={GALLERY_REVIEW_SERIES}
            rows={GALLERY_REVIEW_ROWS}
            view={view}
            labelHeader='模型'
            totalHeader='未通过'
          />
        </Panel>
      </div>
    </Specimen>
  );
}

type GalleryTagKey = 'spec' | 'cause' | 'scope' | 'other' | 'untagged';

const GALLERY_TAG_SERIES: Array<StackedBarSeries<GalleryTagKey>> = [
  { key: 'spec', label: 'Missed a stated requirement', color: 'cat-1' },
  { key: 'cause', label: 'Wrong root cause', color: 'cat-2' },
  { key: 'scope', label: 'Out-of-scope change', color: 'cat-3' },
  { key: 'other', label: 'Other', color: 'cat-6' },
  { key: 'untagged', label: 'Untagged', color: 'unknown' },
];

const GALLERY_TAG_VALUES: Array<Record<GalleryTagKey, number>> = [
  { spec: 12, cause: 8, scope: 3, other: 1, untagged: 4 },
  { spec: 5, cause: 0, scope: 2, other: 0, untagged: 6 },
  { spec: 0, cause: 0, scope: 0, other: 0, untagged: 0 },
];

const GALLERY_TAG_MODELS = ['model-alpha', 'model-beta', 'oracle'];

function StackedBarChangeSpecimen(): ReactNode {
  const [round, setRound] = useState(0);
  const rows: Array<StackedBarRow<GalleryTagKey>> = GALLERY_TAG_MODELS.map(
    (model, i) => ({
      key: model,
      label: model,
      values: GALLERY_TAG_VALUES[(i + round) % GALLERY_TAG_VALUES.length],
    })
  );
  return (
    <Specimen
      caption={`cat-* + unknown · zero segments omitted · a 0 row keeps an endpoint · max · direction · values change → widths slide · round ${String(round)}`}
      span={3}
    >
      <div className='gallery__stack gallery__stack--fill'>
        <StackedBar
          series={GALLERY_TAG_SERIES}
          rows={rows}
          max={40}
          direction='fewer is better'
          labelHeader='Model'
          totalHeader='Failed runs'
        />
        <AegisButton
          tone='secondary'
          onClick={() => {
            setRound((r) => r + 1);
          }}
        >
          Change values
        </AegisButton>
      </div>
    </Specimen>
  );
}

const GALLERY_CHART_TYPES = [
  { key: 'ranking', label: 'Model ranking' },
  { key: 'pareto', label: 'Pareto front' },
];

const GALLERY_SELECT_OPTIONS = [
  { value: 'first', label: '第一候选' },
  { value: 'all', label: '全部题目' },
];

function SelectSpecimen(): ReactNode {
  const [value, setValue] = useState('first');
  return (
    <AegisSelect
      label='题目范围'
      value={value}
      allowClear
      placeholder='选择题目范围'
      options={GALLERY_SELECT_OPTIONS}
      onChange={setValue}
    />
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

function PickerFieldSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);
  const [chart, setChart] = useState('ranking');
  return (
    <div className='gallery__row'>
      <Specimen caption='label · value · opens a Dialog'>
        <PickerField
          label='Chart type'
          value={GALLERY_CHART_TYPES.find((t) => t.key === chart)?.label}
          onClick={() => {
            setOpen(true);
          }}
        />
      </Specimen>
      <Specimen caption='placeholder'>
        <PickerField
          label='Compare models'
          placeholder='All models'
          onClick={() => {
            setOpen(true);
          }}
        />
      </Specimen>
      <Specimen caption='long value · ellipsis in a 192 column'>
        <div style={{ width: 192 }}>
          <PickerField
            label='Compare models'
            value='GPT 6.1 Sol, DeepSeek Flash, GLM 5.3 Flash'
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
      </Specimen>
      <Specimen caption='disabled'>
        <PickerField
          label='Compare models'
          value='3 models'
          disabled
          onClick={() => {
            /* no-op */
          }}
        />
      </Specimen>
      <Dialog
        open={open}
        title='Chart type'
        width='sm'
        onClose={() => {
          setOpen(false);
        }}
      >
        {GALLERY_CHART_TYPES.map((t) => (
          <AegisButton
            key={t.key}
            tone={t.key === chart ? 'primary' : 'secondary'}
            onClick={() => {
              setChart(t.key);
              setOpen(false);
            }}
          >
            {t.label}
          </AegisButton>
        ))}
      </Dialog>
    </div>
  );
}

type GalleryDialogKey = 'sm' | 'md' | 'lg';

const GALLERY_DIALOG_RUNS = Array.from({ length: 40 }, (_, index) => ({
  k: `run-${String(index + 1).padStart(2, '0')}`,
  v: index % 7 === 3 ? '错误' : '正确',
}));

function DialogSpecimen(): ReactNode {
  const [openKey, setOpenKey] = useState<GalleryDialogKey | null>(null);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const close = () => {
    setOpenKey(null);
  };
  return (
    <div className='gallery__row'>
      <Specimen caption='width=sm · body · footer'>
        <AegisButton
          tone='secondary'
          onClick={() => {
            setOpenKey('sm');
          }}
        >
          移除标签
        </AegisButton>
      </Specimen>
      <Specimen caption='width=md · description · form body · footer'>
        <AegisButton
          onClick={() => {
            setOpenKey('md');
          }}
        >
          发布新版本
        </AegisButton>
      </Specimen>
      <Specimen caption='width=lg · description · long body scrolls, no footer'>
        <AegisButton
          tone='secondary'
          onClick={() => {
            setOpenKey('lg');
          }}
        >
          查看运行
        </AegisButton>
      </Specimen>
      <Dialog
        open={openKey === 'sm'}
        width='sm'
        title='移除标签'
        footer={
          <>
            <AegisButton tone='secondary' onClick={close}>
              取消
            </AegisButton>
            <AegisButton tone='primary' onClick={close}>
              移除
            </AegisButton>
          </>
        }
        onClose={close}
      >
        题目留在数据集中，只是不再出现在这个展示集里。
      </Dialog>
      <Dialog
        open={openKey === 'md'}
        width='md'
        title='发布新版本'
        description='发布后，展示站改用这一版本的题目与评分。'
        footer={
          <>
            <AegisButton tone='secondary' onClick={close}>
              取消
            </AegisButton>
            <AegisButton tone='primary' onClick={close}>
              发布 V2
            </AegisButton>
          </>
        }
        onClose={close}
      >
        <TextField
          label='版本说明'
          placeholder='例如：修正评分说明'
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
        <Checkbox
          checked={notify}
          onChange={setNotify}
          label='发布后通知订阅者'
        />
      </Dialog>
      <Dialog
        open={openKey === 'lg'}
        width='lg'
        title='运行记录'
        description='40 次运行 · 当前评分规则'
        onClose={close}
      >
        <KeyValueList items={GALLERY_DIALOG_RUNS} />
      </Dialog>
    </div>
  );
}

function CommandGallerySpecimen(): ReactNode {
  const { setPaletteOpen } = useCommands();
  const cmds: Command[] = [
    {
      id: 'projects.create',
      label: 'Create project',
      description: 'Spin up a new project workspace.',
      group: 'Quick actions',
      icon: <PlusOutlined />,
      shortcut: 'mod+shift+n',
      keywords: ['new', 'project', 'add'],
      handler: () => console.warn('[demo] create project'),
    },
    {
      id: 'experiments.run',
      label: 'Run experiment',
      description: 'Trigger the default experiment pipeline.',
      group: 'Quick actions',
      keywords: ['run', 'start', 'go'],
      handler: () => console.warn('[demo] run experiment'),
    },
    {
      id: 'search.global',
      label: 'Global search',
      description: 'Search across every workspace.',
      group: 'Navigate',
      icon: <SearchOutlined />,
      shortcut: 'mod+/',
      handler: () => console.warn('[demo] global search'),
    },
    {
      id: 'nav.dashboard',
      label: 'Go to dashboard',
      group: 'Navigate',
      handler: () => console.warn('[demo] dashboard'),
    },
    {
      id: 'nav.inbox',
      label: 'Go to inbox',
      group: 'Navigate',
      keywords: ['notifications'],
      handler: () => console.warn('[demo] inbox'),
    },
    {
      id: 'settings.profile',
      label: 'Edit profile',
      description: 'Update your name, avatar and contact info.',
      group: 'Settings',
      icon: <UserOutlined />,
      handler: () => console.warn('[demo] profile'),
    },
    {
      id: 'settings.preferences',
      label: 'Preferences',
      description: 'Theme, density, keyboard shortcuts.',
      group: 'Settings',
      icon: <SettingOutlined />,
      shortcut: 'mod+,',
      handler: () => console.warn('[demo] preferences'),
    },
    {
      id: 'session.signout',
      label: 'Sign out',
      group: 'Settings',
      icon: <LogoutOutlined />,
      handler: () => console.warn('[demo] sign out'),
    },
  ];
  useRegisterCommands(cmds);

  return (
    <div className='gallery__specimen-row'>
      <Button type='primary' onClick={() => setPaletteOpen(true)}>
        Open palette (or press ⌘K)
      </Button>
      <span className='gallery__specimen-hint'>
        mod+k toggles globally while a CommandProvider is mounted.
      </span>
    </div>
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

interface GalleryTaskFile extends FileTreeFile {
  language: string;
  code: string;
}

const GALLERY_TASK_FILES: GalleryTaskFile[] = [
  {
    path: 'instruction.md',
    note: '2.1 KB',
    language: 'markdown',
    code: '# Export latency after a rollback\n\nFind why batch exports stall and submit an answer.',
  },
  {
    path: 'environment/Dockerfile',
    note: '1.4 KB',
    language: 'dockerfile',
    code: 'FROM python:3.13-slim\nCOPY app/ /srv/app/\nCMD ["python", "/srv/app/server.py"]',
  },
  {
    path: 'environment/app/server.py',
    note: '8.2 KB',
    language: 'python',
    code: 'from http.server import ThreadingHTTPServer\n\nserve(ThreadingHTTPServer(("", 8080), Handler))',
  },
  {
    path: 'tests/grading.toml',
    note: '3.0 KB',
    language: 'toml',
    code: '[grading]\nverdict = "all"\n\n[[case]]\nid = "no_dml"\nscript = "cases/no_dml.py"',
  },
  {
    path: 'tests/cases/no_dml.py',
    note: '1.1 KB',
    language: 'python',
    code: 'def check(answer):\n    return "DELETE" not in answer.sql',
  },
  {
    path: 'tests/cases/replica_lag_within_budget_after_rollback.py',
    note: '2.4 KB',
    language: 'python',
    code: 'def check(metrics):\n    return metrics.replica_lag_s < 5',
  },
  {
    path: 'solution/solve.sh',
    note: '420 B',
    language: 'bash',
    code: 'psql -f /solution/fix.sql',
  },
];

function FileTreeSpecimen(): ReactNode {
  const [selected, setSelected] = useState('tests/grading.toml');
  const file = GALLERY_TASK_FILES.find((row) => row.path === selected);
  return (
    <div style={{ width: '100%' }}>
      <ColumnLayout columns='400fr 712fr' gap='md'>
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          <FileTree
            files={GALLERY_TASK_FILES}
            ariaLabel='Task files'
            selectedPath={selected}
            onSelect={setSelected}
            defaultExpandedPaths={['tests/']}
          />
        </div>
        <CodeBlock
          code={file?.code ?? ''}
          language={file?.language}
          maxHeight={240}
          showLineNumbers
        />
      </ColumnLayout>
    </div>
  );
}

const GALLERY_TASK_DIRECTORIES = [
  'environment/',
  'environment/app/',
  'solution/',
  'tests/',
  'tests/cases/',
];

function FileTreeControlledSpecimen(): ReactNode {
  const [openPaths, setOpenPaths] = useState(['tests/']);
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <div style={{ width: 320 }}>
        <FileTree
          files={GALLERY_TASK_FILES}
          ariaLabel='Task files, controlled'
          expandedPaths={openPaths}
          onExpandedPathsChange={setOpenPaths}
        />
      </div>
      <div className='gallery__row'>
        <AegisButton
          tone='secondary'
          onClick={() => setOpenPaths(GALLERY_TASK_DIRECTORIES)}
        >
          全部展开
        </AegisButton>
        <AegisButton tone='secondary' onClick={() => setOpenPaths([])}>
          全部收起
        </AegisButton>
        <MetricLabel>{openPaths.length} open</MetricLabel>
      </div>
    </div>
  );
}

const INSPECTABLE_SAMPLES: InspectableContent[] = [
  {
    title: 'tool result · nested JSON string',
    value:
      '{"service":"payment","error_rate":0.42,"spans":"[{\\"name\\":\\"POST /charge\\",\\"status\\":\\"error\\"}]"}',
  },
  {
    title: 'assistant · markdown',
    value:
      '## Root cause\n\n- `payment` pool exhausted at **14:22**\n- retries amplified load on `catalog`',
  },
  {
    title: 'query_sql · args',
    value:
      "SELECT service, count(*) AS errors\nFROM spans\nWHERE status = 'error'\nGROUP BY service",
  },
  {
    title: 'plain text',
    value: 'Pod payment-7f9c restarted 3 times in the last 10 minutes.',
  },
];

function ContentInspectorSpecimen(): ReactNode {
  const [open, setOpen] = useState<InspectableContent | null>(null);
  return (
    <>
      <div className='gallery__row gallery__row--wide'>
        {INSPECTABLE_SAMPLES.map((sample) => (
          <Specimen key={sample.title} caption={sample.title} span={2}>
            <div className='gallery__stack gallery__stack--fill'>
              <ContentPreview content={sample} />
              <AegisButton tone='ghost' onClick={() => setOpen(sample)}>
                Open in inspector
              </AegisButton>
            </div>
          </Specimen>
        ))}
      </div>
      <ContentInspectorDialog
        open={open !== null}
        content={open}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

function SessionRunViewSpecimen(): ReactNode {
  const [open, setOpen] = useState<InspectableContent | null>(null);
  return (
    <>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='SessionRunTrajectoryView' span={2}>
          <div className='gallery__stack--fill'>
            <SessionRunTrajectoryView
              summary={{
                lineage: 'root · 2 children',
                startedAt: '2026-10-21T02:14:00Z',
                inputTokens: '18.4k',
                outputTokens: '2.1k',
              }}
              messages={[
                {
                  id: 'msg_01system00',
                  role: 'system',
                  content: [
                    { type: 'text', text: 'You are an RCA agent. Use tools.' },
                  ],
                },
                {
                  id: 'msg_02assist00',
                  role: 'assistant',
                  highlighted: true,
                  content: [
                    {
                      type: 'text',
                      text: 'Checking error rates for the **payment** service first.',
                    },
                    {
                      type: 'tool_call',
                      name: 'query_sql',
                      arguments: {
                        sql: "SELECT count(*) FROM spans WHERE status = 'error'",
                      },
                    },
                  ],
                },
                {
                  id: 'msg_03tool000',
                  role: 'tool',
                  content: [{ type: 'tool_result', output: { count: 1284 } }],
                },
              ]}
              onInspectContent={setOpen}
            />
          </div>
        </Specimen>
        <Specimen caption='SessionRunOutputView' span={2}>
          <div className='gallery__stack--fill'>
            <SessionRunOutputView
              facts={[
                { key: 'agent', label: 'Agent', value: 'rca-agent' },
                { key: 'model', label: 'Model', value: 'claude-opus-5-5' },
                { key: 'duration', label: 'Duration', value: '4m 12s' },
              ]}
              acceptedSubmission={{
                tool: 'submit_rca',
                payload: { root_causes: ['payment'] },
                result: { accepted: true },
                summary: 'payment — connection pool exhausted',
              }}
              tools={[
                {
                  id: 't1',
                  tool: 'query_sql',
                  duration: '312ms',
                  args: { sql: 'SELECT 1' },
                  result: { rows: 1 },
                },
                {
                  id: 't2',
                  tool: 'submit_rca',
                  duration: '48ms',
                  args: { root_causes: [] },
                  result: { error: 'empty root_causes' },
                  errored: true,
                },
              ]}
              onInspectContent={setOpen}
            />
          </div>
        </Specimen>
        <Specimen caption='loading'>
          <SessionRunTrajectoryView
            summary={{
              lineage: '',
              startedAt: '',
              inputTokens: '',
              outputTokens: '',
            }}
            messages={[]}
            loading
            onInspectContent={setOpen}
          />
        </Specimen>
        <Specimen caption='error'>
          <SessionRunOutputView
            facts={[]}
            tools={[]}
            error='trajectory store unreachable'
            onInspectContent={setOpen}
          />
        </Specimen>
      </div>
      <ContentInspectorDialog
        open={open !== null}
        content={open}
        onClose={() => setOpen(null)}
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

interface DemoDataset {
  id: string;
  name: string;
  status: string;
}

const DEMO_DATASETS: DemoDataset[] = [
  { id: 'ds-001', name: 'wikitext-103', status: 'ready' },
  { id: 'ds-002', name: 'imagenet-mini', status: 'syncing' },
  { id: 'ds-003', name: 'common-crawl-en', status: 'ready' },
  { id: 'ds-004', name: 'cifar-10', status: 'archived' },
];

function AgentIntegrationSpecimen(): ReactNode {
  const [log, setLog] = useState<string[]>([]);
  const [debug, setDebug] = useState<string>('(waiting for runtime)');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  const toastAction: AegisAction<void, string> = {
    id: 'gallery.demo.toast',
    label: 'Show toast',
    description: 'Appends a timestamped line to the local log.',
    appliesTo: { surfaceKind: 'list' },
    run: () => {
      const stamp = new Date().toISOString().slice(11, 19);
      const line = `[${stamp}] toast fired via agent runtime`;
      setLog((prev) => [...prev.slice(-9), line]);
      return line;
    },
  };

  const selectAction: AegisAction<{ id: string }, { id: string }> = {
    id: 'gallery.demo.select-dataset',
    label: 'Select dataset',
    description: 'Marks one demo dataset row as selected.',
    run: ({ id }) => {
      setSelectedId(id);
      return { id };
    },
  };

  const fillAction: AegisAction<{ value: string }, { value: string }> = {
    id: 'gallery.demo.fill-input',
    label: 'Fill agent demo input',
    description: 'Writes an arbitrary string into the demo input field.',
    run: ({ value }) => {
      setInputValue(value);
      return { value };
    },
  };

  useAegisAction(selectAction);
  useAegisAction(fillAction);

  // Demo SearchProvider — surfaces entities NOT currently mounted, so the
  // probe can verify the `source: 'provider'` path without seeding the
  // visible list with extra rows.
  const deepDatasets = useMemo<SearchProvider>(
    () => ({
      id: 'gallery.demo.deep-datasets',
      appId: 'gallery',
      kinds: ['entity'],
      search: (query) => {
        const candidates = [
          { id: 'ds-100', label: 'wikitext-v3-shadow' },
          { id: 'ds-200', label: 'imagenet-archive' },
        ];
        const q = query.toLowerCase();
        const hits: AegisSearchResult[] = candidates
          .filter((c) => c.id.includes(q) || c.label.toLowerCase().includes(q))
          .map((c) => ({
            ref: { kind: 'entity', entityId: c.id },
            kind: 'entity',
            label: c.label,
            source: 'provider',
            score: 0.5,
          }));
        return Promise.resolve(hits);
      },
    }),
    []
  );
  useAegisSearchProvider(deepDatasets);

  const [inspectSurfaceText, setInspectSurfaceText] = useState<string>('(…)');
  const [inspectEntityText, setInspectEntityText] = useState<string>('(…)');
  const [searchText, setSearchText] = useState<string>('(…)');

  // Push selection into the runtime whenever the row picked by the user (or
  // by the agent) changes — keeps `snapshot.selection` in sync.
  useEffect(() => {
    const rt = window.__aegis;
    if (!rt) {
      return;
    }
    rt._setSelection(selectedId ? [{ id: selectedId, type: 'dataset' }] : []);
  }, [selectedId]);

  const columns: Array<DataListColumn<DemoDataset>> = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  useEffect(() => {
    const tick = (): void => {
      const rt = window.__aegis;
      if (!rt) {
        setDebug('window.__aegis not found');
        return;
      }
      const payload = {
        actions: rt.listActions().map((a) => a.id),
        snapshot: rt.snapshot(),
      };
      setDebug(JSON.stringify(payload, null, 2));
      setInspectSurfaceText(
        JSON.stringify(
          rt.inspect({ kind: 'surface', surfaceId: 'gallery.demo.datasets' }),
          null,
          2
        )
      );
      setInspectEntityText(
        JSON.stringify(
          rt.inspect({ kind: 'entity', entityId: 'ds-001' }),
          null,
          2
        )
      );
      void rt.search('imagenet').then((hits) => {
        setSearchText(JSON.stringify(hits, null, 2));
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      className='gallery__row gallery__row--wide'
      style={{ alignItems: 'flex-start' }}
    >
      <Specimen caption='Button with action prop' span={2}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <AegisButton action={toastAction}>Show toast</AegisButton>
          <DataList
            items={DEMO_DATASETS}
            columns={columns}
            selectedId={selectedId ?? undefined}
            onSelect={setSelectedId}
            surface={{
              id: 'gallery.demo.datasets',
              kind: 'list',
              label: 'Demo datasets',
              project: (rows) => ({
                entities: rows.map((r) => ({
                  id: r.id,
                  type: 'dataset',
                  label: r.name,
                  data: { status: r.status },
                })),
              }),
            }}
          />
          <TextField
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            aria-label='agent demo input'
            placeholder='Agent will fill this…'
          />
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-muted)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'var(--space-12)',
              overflow: 'auto',
            }}
          >
            {log.length === 0 ? '(no invocations yet)' : log.join('\n')}
          </pre>
        </div>
      </Specimen>
      <Specimen caption='live snapshot · 1s poll' span={3}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <pre
            aria-label='aegis-debug-snapshot'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 4)',
              overflow: 'auto',
            }}
          >
            {debug}
          </pre>
          <pre
            aria-label='aegis-inspect-surface'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {inspectSurfaceText}
          </pre>
          <pre
            aria-label='aegis-inspect-entity'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {inspectEntityText}
          </pre>
          <pre
            aria-label='aegis-search-imagenet'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {searchText}
          </pre>
        </div>
      </Specimen>
    </div>
  );
}

interface AskWindow extends Window {
  __aegisOpenAskPanel?: (
    trigger: {
      origin: 'entity' | 'surface' | 'action' | 'global';
      surfaceId?: string;
      entityId?: string;
      actionId?: string;
    },
    anchorEl?: HTMLElement | null
  ) => void;
}

function AskAffordanceSpecimen(): ReactNode {
  const [log, setLog] = useState<string[]>([]);

  const askRows = useMemo(
    () => [
      { id: 'ask-row-1', label: 'imagenet-mini' },
      { id: 'ask-row-2', label: 'wikitext-v3' },
    ],
    []
  );
  const askOptOutRows = useMemo(
    () => [{ id: 'ask-optout-1', label: 'opt-out · ask disabled' }],
    []
  );

  useAegisSurface({
    id: 'gallery.ask.demo',
    kind: 'list',
    label: 'Ask demo',
    askSuggestions: ['Why is this row flagged?', 'Summarise recent changes'],
    data: askRows,
    project: (rows) => ({
      entities: rows.map((r) => ({
        id: r.id,
        type: 'dataset',
        label: r.label,
      })),
    }),
  });

  useEffect(() => {
    const w = window as AskWindow & {
      __aegis?: { onAskTriggered?: (h: (ctx: unknown) => void) => () => void };
    };
    const rt = w.__aegis;
    if (!rt?.onAskTriggered) {
      return;
    }
    return rt.onAskTriggered((ctx) => {
      const c = ctx as { origin: string; entity?: { id?: string } };
      const stamp = new Date().toISOString().slice(11, 19);
      setLog((prev) => [
        ...prev.slice(-9),
        `[${stamp}] askTriggered origin=${c.origin} entity=${c.entity?.id ?? '-'}`,
      ]);
    });
  }, []);

  const onTriggerJs = useCallback(() => {
    const w = window as AskWindow;
    const anchor = document.querySelector<HTMLElement>(
      '[data-ask-demo-row="ask-row-1"]'
    );
    w.__aegisOpenAskPanel?.(
      {
        origin: 'entity',
        surfaceId: 'gallery.ask.demo',
        entityId: 'ask-row-1',
      },
      anchor
    );
  }, []);

  return (
    <div
      className='gallery__row gallery__row--wide'
      style={{ alignItems: 'flex-start' }}
    >
      <Specimen caption='right-click any row · or use Cmd/Ctrl + .' span={3}>
        <div
          data-agent-surface-id='gallery.ask.demo'
          data-aegis-ask-demo-surface=''
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2)',
          }}
        >
          {askRows.map((row) => (
            <div
              key={row.id}
              data-agent-entity-id={row.id}
              data-ask-demo-row={row.id}
              tabIndex={0}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-13)',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'context-menu',
              }}
            >
              {row.id} · {row.label}
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen caption='ask: false · right-click does NOT open panel' span={2}>
        <div
          data-agent-surface-id='gallery.ask.optout'
          data-agent-ask='off'
          data-aegis-ask-optout-surface=''
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2)',
          }}
        >
          {askOptOutRows.map((row) => (
            <div
              key={row.id}
              data-agent-entity-id={row.id}
              data-ask-optout-row={row.id}
              tabIndex={0}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-13)',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'context-menu',
              }}
            >
              {row.id} · {row.label}
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen caption='programmatic open · ask event log' span={2}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <AegisButton onClick={onTriggerJs}>Trigger ask via JS</AegisButton>
          <pre
            aria-label='aegis-ask-event-log'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {log.length === 0 ? '(no ask events yet)' : log.join('\n')}
          </pre>
        </div>
      </Specimen>
    </div>
  );
}

interface SampleEvent {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

const SERVICES = [
  'order-svc',
  'cart-svc',
  'inventory',
  'auth',
  'gateway',
  'billing',
];
const LEVELS: Array<SampleEvent['level']> = ['info', 'warn', 'error'];

function makeEvent(i: number): SampleEvent {
  const level = LEVELS[i % LEVELS.length] ?? 'info';
  const service = SERVICES[i % SERVICES.length] ?? 'gateway';
  return {
    id: `evt-${String(i).padStart(6, '0')}`,
    ts: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    level,
    service,
    message: `request handled in ${(20 + (i % 480)).toString()}ms`,
  };
}

function makeEvents(count: number, offset = 0): SampleEvent[] {
  return Array.from({ length: count }, (_, i) => makeEvent(i + offset));
}

const eventColumns: Array<EventTableColumn<SampleEvent>> = [
  {
    key: 'ts',
    header: 'Timestamp',
    width: 220,
    render: (row) => <MonoValue size='sm'>{row.ts}</MonoValue>,
  },
  {
    key: 'level',
    header: 'Level',
    width: 90,
    align: 'center',
    render: (row) => {
      const tone =
        row.level === 'error'
          ? 'warning'
          : row.level === 'warn'
            ? 'ink'
            : 'default';
      return <Chip tone={tone}>{row.level}</Chip>;
    },
    truncate: false,
  },
  {
    key: 'service',
    header: 'Service',
    width: 140,
    render: (row) => row.service,
  },
  {
    key: 'message',
    header: 'Message',
    render: (row) => row.message,
  },
];

const SMALL_EVENTS = makeEvents(50);
const LARGE_EVENTS = makeEvents(10_000);

function EventTableSpecimen(): ReactNode {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    SMALL_EVENTS[2]?.id
  );
  const [paginated, setPaginated] = useState<SampleEvent[]>(() =>
    makeEvents(200)
  );
  const handleLoadMore = useCallback(() => {
    setPaginated((prev) => prev.concat(makeEvents(1000, prev.length)));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <MetricLabel as='div' size='xs'>
          50 rows · sticky header · row selection
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={SMALL_EVENTS}
          rowKey={(row) => row.id}
          selectedKey={selectedKey}
          onRowClick={(row) => {
            setSelectedKey(row.id);
          }}
          maxVisibleRows={10}
        />
      </div>
      <div>
        <MetricLabel as='div' size='xs'>
          10,000 rows · virtualization perf
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={LARGE_EVENTS}
          rowKey={(row) => row.id}
          maxVisibleRows={12}
        />
      </div>
      <div>
        <MetricLabel as='div' size='xs'>
          onLoadMore · appends 1,000 rows on scroll-to-bottom · current size{' '}
          {paginated.length.toString()}
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={paginated}
          rowKey={(row) => row.id}
          onLoadMore={handleLoadMore}
          maxVisibleRows={12}
        />
      </div>
    </div>
  );
}
