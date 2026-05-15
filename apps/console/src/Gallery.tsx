import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  type AgentCommandInvocation,
  type AgentContextValue,
  type AgentMessage,
  AgentPanel,
  AgentProvider,
  AuthLayout,
  type AegisAction,
  Avatar,
  BlastRadiusBar,
  Breadcrumb,
  Button as AegisButton,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  ChatSessionList,
  Chip,
  type Command,
  CodeEditor,
  CommandInvocationCard,
  CommandPalette,
  CommandProvider,
  CodeBlock,
  ControlListItem,
  DangerZone,
  DataList,
  type DataListColumn,
  DataTable,
  DiffViewer,
  DropdownMenu,
  EmptyState,
  EnvironmentSwitcher,
  type EnvironmentSwitcherOption,
  ErrorState,
  BucketCard,
  FileDropzone,
  FilePreview,
  MetadataList,
  ObjectBrowser,
  ObjectInspector,
  SearchInput,
  ShareLinkDialog,
  UploadQueue,
  ForgotPasswordForm,
  FormRow,
  InboxPage,
  LoginForm,
  type AegisNotification,
  type NotificationContextValue,
  NotificationBell,
  NotificationProvider,
  useCommands,
  useRegisterCommands,
  type KeyValueItem,
  KeyValueList,
  MetricCard,
  Markdown,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  ParquetViewer,
  TraceTree,
  type TraceSpan,
  PasswordField,
  ProjectSelector,
  RegisterForm,
  Tabs as RosettaTabs,
  SectionDivider,
  SettingsSection,
  SparkLine,
  StatBlock,
  StatusDot,
  Terminal,
  ThemeToggle,
  type TerminalLine,
  Timeline,
  TextField,
  TimeDisplay,
  Toolbar,
  ToolCallCard,
  type ToolCallData,
  TrajectoryStep,
  type TrajectoryStepData,
  TrajectoryTimeline,
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
  type AegisSearchResult,
  type SearchProvider,
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

import './Gallery.css';

/* ── Static specimen data ──────────────────────────────────────────── */

const COLOR_TOKENS: Array<{
  name: string;
  value: string;
  desc: string;
  inverted?: boolean;
}> = [
  { name: '--bg-page', value: '#F5F5F7', desc: 'Page surface' },
  { name: '--bg-panel', value: '#FFFFFF', desc: 'Panel surface' },
  {
    name: '--bg-inverted',
    value: '#000000',
    desc: 'Active / inverted',
    inverted: true,
  },
  { name: '--bg-muted', value: '#E8E8ED', desc: 'Muted surface' },
  { name: '--bg-warning-soft', value: '#FEF2F2', desc: 'Warning wash' },
  { name: '--accent-warning', value: '#E11D48', desc: 'Anomaly accent' },
];

const TYPE_SAMPLES: Array<{
  family: 'brand' | 'ui' | 'mono';
  label: string;
  sample: string;
  hint: string;
}> = [
  {
    family: 'brand',
    label: 'Display · Geist',
    sample: 'Resilience under pressure',
    hint: 'Section voice — panel titles & hero',
  },
  {
    family: 'ui',
    label: 'UI · Inter',
    sample: 'The quick brown fox jumps over the lazy dog',
    hint: 'Default body / control text',
  },
  {
    family: 'mono',
    label: 'Data · JetBrains Mono',
    sample: '0.142 · 9 384 122 ms · v0.1.0-rc4',
    hint: 'Numbers, IDs, parameters — tabular nums',
  },
];

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

/* ── Roadmap previews ─────────────────────────────────────────────── */
/**
 * Each roadmap card is a placeholder for a component the experiment-observation
 * page is going to need but isn't built yet. The preview shows the visual
 * intent; the reference link points at the implementation pattern we'd build
 * on top of.
 */

interface RoadmapSpec {
  name: string;
  desc: string;
  status: string;
  reference?: { label: string; url: string };
  preview: ReactNode;
}

interface RoadmapGroup {
  label: string;
  cards: RoadmapSpec[];
}

const REF_ANTD = {
  label: 'ant-design/ant-design',
  url: 'https://github.com/ant-design/ant-design',
};
const REF_ECHARTS = {
  label: 'apache/echarts',
  url: 'https://github.com/apache/echarts',
};
const REF_MONACO = {
  label: 'microsoft/monaco-editor',
  url: 'https://github.com/microsoft/monaco-editor',
};

const ROADMAP_GROUPS: RoadmapGroup[] = [
  {
    label: 'Shell & layout',
    cards: [
      {
        name: 'ExperimentHeader',
        desc: 'Sticky anchor: id, fault chips, time window, status, run-by — drives every panel below.',
        status: 'Composition',
        preview: (
          <div className='mock-exp-header'>
            <StatusDot pulse />
            <Chip tone='ink'>INJ-29F1</Chip>
            <span className='mock-exp-header__title'>kafka loadgen drift</span>
            <MonoValue size='sm' weight='regular'>
              14:22 → 14:36
            </MonoValue>
            <Chip>EU-WEST-01</Chip>
          </div>
        ),
      },
      {
        name: 'ExperimentSummaryCard',
        desc: 'Compact tile for list pages: id, fault chips, blast bar, status — the row in a multi-experiment list.',
        status: 'Composition',
        preview: (
          <div className='mock-summary'>
            <div className='mock-summary__head'>
              <PanelTitle size='sm'>INJ-29F1</PanelTitle>
              <Chip tone='ink'>running</Chip>
            </div>
            <div className='mock-summary__chips'>
              <Chip>NetworkLatency</Chip>
              <Chip>order-svc</Chip>
            </div>
            <BlastRadiusBar value={42} hideTicks />
          </div>
        ),
      },
      {
        name: 'TabbedWorkbench',
        desc: 'Spec / Logs / Traces / Metrics / Code / Config / RCA — main scaffold of the experiment view.',
        status: 'Wraps AntD',
        reference: REF_ANTD,
        preview: (
          <div className='mock-tabs'>
            <span className='mock-tabs__tab'>Spec</span>
            <span className='mock-tabs__tab mock-tabs__tab--active'>Logs</span>
            <span className='mock-tabs__tab'>Traces</span>
            <span className='mock-tabs__tab'>Metrics</span>
            <span className='mock-tabs__tab'>Code</span>
            <span className='mock-tabs__tab'>RCA</span>
          </div>
        ),
      },
      {
        name: 'DetailDrawer',
        desc: 'Slide-in side sheet to inspect a single span / log / event without leaving the experiment view.',
        status: 'Wraps AntD',
        reference: REF_ANTD,
        preview: (
          <div className='mock-drawer'>
            <div className='mock-drawer__page'>main view</div>
            <div className='mock-drawer__sheet'>
              <MetricLabel size='xs'>→ inspect</MetricLabel>
              <MonoValue size='sm' weight='regular'>
                span-a3f29
              </MonoValue>
            </div>
          </div>
        ),
      },
      {
        name: 'SplitPane',
        desc: 'Two-pane resizable layout (chart on top, log on bottom — both share the time brush).',
        status: 'Planned',
        reference: {
          label: 'bvaughn/react-resizable-panels',
          url: 'https://github.com/bvaughn/react-resizable-panels',
        },
        preview: (
          <div className='mock-split'>
            <div className='mock-split__pane'>chart</div>
            <div className='mock-split__handle' aria-hidden>
              ⋮
            </div>
            <div className='mock-split__pane'>logs</div>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Time & correlation',
    cards: [
      {
        name: 'FaultWindow',
        desc: 'Pre / fault / recovery / post horizontal bar; brushable; the experiment-wide time source.',
        status: 'Planned',
        reference: {
          label: 'd3/d3-brush',
          url: 'https://github.com/d3/d3-brush',
        },
        preview: (
          <div className='mock-fault-window'>
            <div className='mock-fault-window__bar'>
              <span
                className='mock-fault-window__seg mock-fault-window__seg--pre'
                style={{ flex: '1 1 25%' }}
              >
                pre
              </span>
              <span
                className='mock-fault-window__seg mock-fault-window__seg--fault'
                style={{ flex: '1 1 35%' }}
              >
                fault
              </span>
              <span
                className='mock-fault-window__seg mock-fault-window__seg--recover'
                style={{ flex: '1 1 25%' }}
              >
                recover
              </span>
              <span
                className='mock-fault-window__seg mock-fault-window__seg--post'
                style={{ flex: '1 1 15%' }}
              >
                post
              </span>
            </div>
            <div className='mock-fault-window__ticks'>
              <span>14:00</span>
              <span>14:08</span>
              <span>14:24</span>
              <span>14:30</span>
            </div>
          </div>
        ),
      },
      {
        name: 'CorrelationCursor',
        desc: 'Cross-pane vertical cursor — hover any chart, the rest sync. Killer feature, needs a TimeContext.',
        status: 'Planned',
        reference: {
          label: 'airbnb/visx',
          url: 'https://github.com/airbnb/visx',
        },
        preview: (
          <div className='mock-corr'>
            <svg
              className='mock-corr__line'
              viewBox='0 0 200 26'
              preserveAspectRatio='none'
            >
              <path
                d='M0,18 L20,16 L40,14 L60,12 L80,8 L100,5 L120,8 L140,14 L160,18 L180,22 L200,20'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.2'
              />
            </svg>
            <svg
              className='mock-corr__line'
              viewBox='0 0 200 26'
              preserveAspectRatio='none'
            >
              <path
                d='M0,14 L20,15 L40,13 L60,11 L80,16 L100,20 L120,18 L140,12 L160,10 L180,12 L200,14'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.2'
              />
            </svg>
            <svg
              className='mock-corr__line'
              viewBox='0 0 200 26'
              preserveAspectRatio='none'
            >
              <path
                d='M0,18 L20,16 L40,18 L60,12 L80,6 L100,4 L120,8 L140,14 L160,20 L180,22 L200,24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.2'
              />
            </svg>
            <div className='mock-corr__cursor' />
          </div>
        ),
      },
      {
        name: 'AnnotationBand',
        desc: 'Colored vertical band overlaid on any chart, marking the fault-active interval.',
        status: 'Wraps ECharts',
        reference: REF_ECHARTS,
        preview: (
          <svg
            className='mock-chart'
            viewBox='0 0 200 50'
            preserveAspectRatio='none'
          >
            <rect
              x='60'
              y='0'
              width='60'
              height='50'
              fill='#e11d48'
              opacity='0.10'
            />
            <line
              x1='60'
              y1='0'
              x2='60'
              y2='50'
              stroke='#e11d48'
              strokeWidth='1'
              strokeDasharray='2 2'
            />
            <line
              x1='120'
              y1='0'
              x2='120'
              y2='50'
              stroke='#e11d48'
              strokeWidth='1'
              strokeDasharray='2 2'
            />
            <path
              d='M0,30 L20,28 L40,32 L60,30 L80,18 L100,10 L120,16 L140,30 L160,36 L180,32 L200,30'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
            />
          </svg>
        ),
      },
      {
        name: 'PivotChips',
        desc: 'Top-level service / pod / severity filter tokens — synchronously filter every pane.',
        status: 'Extends Chip',
        reference: REF_ANTD,
        preview: (
          <div className='mock-pivot'>
            <span className='mock-pivot__chip'>
              service: catalog<span className='mock-pivot__close'>×</span>
            </span>
            <span className='mock-pivot__chip'>
              pod: cart-7d<span className='mock-pivot__close'>×</span>
            </span>
            <span className='mock-pivot__chip'>
              severity: error<span className='mock-pivot__close'>×</span>
            </span>
          </div>
        ),
      },
      {
        name: 'JumpToTime',
        desc: '"Open this moment in [Logs / Traces / Metrics]" pill — used inside hover tooltips and evidence rows.',
        status: 'Composition',
        preview: (
          <div className='mock-jump'>
            <Chip tone='ghost'>→ Open in Logs</Chip>
            <Chip tone='ghost'>→ Open in Traces</Chip>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Logs',
    cards: [
      {
        name: 'LogTable',
        desc: 'Virtualized structured-log table with severity colors, service tags, expandable JSON payload.',
        status: 'Planned',
        reference: {
          label: 'bvaughn/react-window',
          url: 'https://github.com/bvaughn/react-window',
        },
        preview: (
          <div className='mock-log-table'>
            <div className='mock-log-row'>
              <span className='mock-log-ts'>14:22:01</span>
              <StatusDot tone='ink' />
              <span className='mock-log-svc'>catalog</span>
              <span className='mock-log-msg'>request received</span>
            </div>
            <div className='mock-log-row'>
              <span className='mock-log-ts'>14:22:02</span>
              <StatusDot tone='warning' />
              <span className='mock-log-svc'>cart</span>
              <span className='mock-log-msg'>DB timeout (2/5)</span>
            </div>
            <div className='mock-log-row'>
              <span className='mock-log-ts'>14:22:02</span>
              <StatusDot tone='warning' pulse />
              <span className='mock-log-svc'>payment</span>
              <span className='mock-log-msg'>500 internal</span>
            </div>
          </div>
        ),
      },
      {
        name: 'LogDensityHistogram',
        desc: 'Compact bar chart above the log list — click a bar to brush the time range.',
        status: 'Wraps ECharts',
        reference: REF_ECHARTS,
        preview: (
          <div className='mock-histo'>
            {[
              0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1, 0.85, 0.6, 0.45, 0.3, 0.5, 0.4,
              0.3, 0.2,
            ].map((h, i) => (
              <span
                key={i}
                className='mock-histo__bar'
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
        ),
      },
      {
        name: 'LogSearchBar',
        desc: 'Query input + severity facets (info / warn / error / fatal) + regex toggle.',
        status: 'Composition',
        preview: (
          <div className='mock-search'>
            <div className='mock-search__input'>message:* timeout</div>
            <Chip tone='ghost'>info</Chip>
            <Chip tone='ink'>warn</Chip>
            <Chip tone='warning'>error</Chip>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Traces',
    cards: [
      {
        name: 'TraceWaterfall',
        desc: 'Span stack with timing bars (service · op · duration · status) — canonical distributed trace viz.',
        status: 'Planned',
        reference: {
          label: 'jaegertracing/jaeger-ui',
          url: 'https://github.com/jaegertracing/jaeger-ui',
        },
        preview: (
          <div className='mock-trace'>
            <div className='mock-trace__row'>
              <span
                className='mock-trace__bar'
                style={{ marginLeft: '0%', width: '90%' }}
              />
              <span className='mock-trace__label'>gateway</span>
            </div>
            <div className='mock-trace__row'>
              <span
                className='mock-trace__bar'
                style={{ marginLeft: '8%', width: '45%' }}
              />
              <span className='mock-trace__label'>catalog</span>
            </div>
            <div className='mock-trace__row'>
              <span
                className='mock-trace__bar mock-trace__bar--warn'
                style={{ marginLeft: '20%', width: '20%' }}
              />
              <span className='mock-trace__label'>redis</span>
            </div>
            <div className='mock-trace__row'>
              <span
                className='mock-trace__bar'
                style={{ marginLeft: '55%', width: '30%' }}
              />
              <span className='mock-trace__label'>cart</span>
            </div>
          </div>
        ),
      },
      {
        name: 'TraceList',
        desc: 'Recent traces with latency / error markers — picks one to feed into TraceWaterfall.',
        status: 'Composition',
        preview: (
          <div className='mock-trace-list'>
            <div className='mock-trace-list__row'>
              <MonoValue size='sm' weight='regular'>
                a3f291b
              </MonoValue>
              <div className='mock-trace-list__track'>
                <span
                  className='mock-trace-list__bar'
                  style={{ width: '70%' }}
                />
              </div>
              <span className='mock-trace-list__num'>642ms</span>
            </div>
            <div className='mock-trace-list__row'>
              <MonoValue size='sm' weight='regular'>
                b8c2419
              </MonoValue>
              <div className='mock-trace-list__track'>
                <span
                  className='mock-trace-list__bar'
                  style={{ width: '45%' }}
                />
              </div>
              <span className='mock-trace-list__num'>412ms</span>
            </div>
            <div className='mock-trace-list__row'>
              <MonoValue size='sm' weight='regular'>
                c91d234
              </MonoValue>
              <div className='mock-trace-list__track'>
                <span
                  className='mock-trace-list__bar mock-trace-list__bar--warn'
                  style={{ width: '95%' }}
                />
              </div>
              <span className='mock-trace-list__num mock-trace-list__num--warn'>
                1.2s
              </span>
            </div>
          </div>
        ),
      },
      {
        name: 'ServiceMap',
        desc: 'Mini topology of services touched by selected traces — nodes + call edges, error edges in red.',
        status: 'Wraps Cytoscape',
        reference: {
          label: 'cytoscape/cytoscape.js',
          url: 'https://github.com/cytoscape/cytoscape.js',
        },
        preview: (
          <svg viewBox='0 0 200 80' className='mock-map'>
            <line
              x1='40'
              y1='40'
              x2='100'
              y2='20'
              stroke='currentColor'
              opacity='0.3'
            />
            <line
              x1='40'
              y1='40'
              x2='100'
              y2='60'
              stroke='currentColor'
              opacity='0.3'
            />
            <line
              x1='100'
              y1='20'
              x2='160'
              y2='40'
              stroke='currentColor'
              opacity='0.3'
            />
            <line
              x1='100'
              y1='60'
              x2='160'
              y2='40'
              stroke='#e11d48'
              strokeDasharray='3 2'
            />
            <circle cx='40' cy='40' r='6' fill='currentColor' />
            <circle cx='100' cy='20' r='6' fill='currentColor' />
            <circle cx='100' cy='60' r='6' fill='#e11d48' />
            <circle cx='160' cy='40' r='6' fill='currentColor' />
            <text
              x='40'
              y='58'
              fontSize='9'
              textAnchor='middle'
              fill='currentColor'
              opacity='0.5'
            >
              gw
            </text>
            <text
              x='100'
              y='14'
              fontSize='9'
              textAnchor='middle'
              fill='currentColor'
              opacity='0.5'
            >
              catalog
            </text>
            <text
              x='100'
              y='76'
              fontSize='9'
              textAnchor='middle'
              fill='currentColor'
              opacity='0.5'
            >
              cart
            </text>
            <text
              x='160'
              y='58'
              fontSize='9'
              textAnchor='middle'
              fill='currentColor'
              opacity='0.5'
            >
              payment
            </text>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Metrics',
    cards: [
      {
        name: 'MetricChart',
        desc: 'Full-size time series — axes, tooltip, multi-series, AnnotationBand slot, ThresholdLine slot.',
        status: 'Wraps ECharts',
        reference: REF_ECHARTS,
        preview: (
          <svg
            className='mock-chart'
            viewBox='0 0 200 60'
            preserveAspectRatio='none'
          >
            <rect
              x='80'
              y='0'
              width='40'
              height='60'
              fill='#e11d48'
              opacity='0.08'
            />
            <line
              x1='0'
              y1='20'
              x2='200'
              y2='20'
              stroke='#e11d48'
              strokeWidth='0.8'
              strokeDasharray='3 3'
            />
            <path
              d='M0,40 L20,38 L40,42 L60,40 L80,36 L100,30 L120,32 L140,38 L160,42 L180,40 L200,38'
              fill='none'
              stroke='currentColor'
              strokeOpacity='0.4'
              strokeWidth='1'
              strokeDasharray='2 2'
            />
            <path
              d='M0,38 L20,36 L40,30 L60,32 L80,18 L100,10 L120,15 L140,28 L160,40 L180,45 L200,42'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
            />
          </svg>
        ),
      },
      {
        name: 'CompareSeries',
        desc: 'Baseline (dashed) overlaid on current (solid) — same chart, two series.',
        status: 'Wraps ECharts',
        reference: REF_ECHARTS,
        preview: (
          <svg
            className='mock-chart'
            viewBox='0 0 200 50'
            preserveAspectRatio='none'
          >
            <path
              d='M0,30 L20,28 L40,30 L60,28 L80,32 L100,30 L120,28 L140,30 L160,32 L180,30 L200,28'
              fill='none'
              stroke='currentColor'
              strokeOpacity='0.4'
              strokeWidth='1'
              strokeDasharray='3 2'
            />
            <path
              d='M0,32 L20,30 L40,28 L60,26 L80,12 L100,8 L120,14 L140,26 L160,36 L180,40 L200,38'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
            />
          </svg>
        ),
      },
      {
        name: 'ThresholdLine',
        desc: 'Horizontal SLO / breach marker on a metric chart — dashed warning red.',
        status: 'Wraps ECharts',
        reference: REF_ECHARTS,
        preview: (
          <svg
            className='mock-chart'
            viewBox='0 0 200 50'
            preserveAspectRatio='none'
          >
            <line
              x1='0'
              y1='14'
              x2='200'
              y2='14'
              stroke='#e11d48'
              strokeWidth='1'
              strokeDasharray='3 3'
            />
            <text x='195' y='11' fontSize='8' textAnchor='end' fill='#e11d48'>
              SLO 200ms
            </text>
            <path
              d='M0,40 L20,38 L40,30 L60,26 L80,16 L100,10 L120,14 L140,28 L160,38 L180,40 L200,38'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
            />
          </svg>
        ),
      },
      {
        name: 'MetricGrid',
        desc: 'Responsive grid of MetricChart / MetricCard, sharing the same time axis. Layout-only.',
        status: 'Composition',
        preview: (
          <div className='mock-grid'>
            <div className='mock-grid__cell'>
              latency p99<strong>142</strong>
            </div>
            <div className='mock-grid__cell'>
              error rate<strong>0.42%</strong>
            </div>
            <div className='mock-grid__cell'>
              throughput<strong>9 384</strong>
            </div>
            <div className='mock-grid__cell'>
              cpu sat<strong>71%</strong>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Code & config',
    cards: [
      {
        name: 'CodeBlock',
        desc: 'Read-only code with line numbers and copy button (Python / Go / TypeScript / shell).',
        status: 'Wraps Monaco',
        reference: REF_MONACO,
        preview: (
          <pre className='mock-code'>
            <span className='mock-code__line'>
              <em>1</em>def main():
            </span>
            <span className='mock-code__line'>
              <em>2</em> try:
            </span>
            <span className='mock-code__line'>
              <em>3</em> run()
            </span>
            <span className='mock-code__line'>
              <em>4</em> except Exception:
            </span>
          </pre>
        ),
      },
      {
        name: 'DiffViewer',
        desc: 'Two-pane file diff — config diff, deployment diff, manifest changes.',
        status: 'Wraps Monaco',
        reference: REF_MONACO,
        preview: (
          <div className='mock-diff'>
            <pre className='mock-diff__col'>
              <span className='mock-diff__line mock-diff__line--rm'>
                - timeout: 30s
              </span>
              <span className='mock-diff__line mock-diff__line--rm'>
                - retries: 3
              </span>
              <span className='mock-diff__line'> qos: best</span>
            </pre>
            <pre className='mock-diff__col'>
              <span className='mock-diff__line mock-diff__line--add'>
                + timeout: 60s
              </span>
              <span className='mock-diff__line mock-diff__line--add'>
                + retries: 5
              </span>
              <span className='mock-diff__line'> qos: best</span>
            </pre>
          </div>
        ),
      },
      {
        name: 'ConfigTree',
        desc: 'Collapsible nested viewer for k8s YAML / app config / trace payloads.',
        status: 'Wraps Monaco',
        reference: REF_MONACO,
        preview: (
          <pre className='mock-tree'>
            <span className='mock-tree__line'>▾ kafka:</span>
            <span className='mock-tree__line' style={{ paddingLeft: '14px' }}>
              ▸ topics: …
            </span>
            <span className='mock-tree__line' style={{ paddingLeft: '14px' }}>
              ▾ network:
            </span>
            <span className='mock-tree__line' style={{ paddingLeft: '28px' }}>
              jitter: 40ms
            </span>
            <span className='mock-tree__line' style={{ paddingLeft: '28px' }}>
              loss: 0.02%
            </span>
          </pre>
        ),
      },
      {
        name: 'CommitLink',
        desc: 'Short SHA + author + relative time, opens repo on click.',
        status: 'Composition',
        preview: (
          <div className='mock-commit'>
            <MonoValue size='sm' weight='regular'>
              a3f291b
            </MonoValue>
            <span className='mock-commit__sep'>·</span>
            <span className='mock-commit__author'>alice</span>
            <span className='mock-commit__sep'>·</span>
            <MetricLabel size='xs'>2h ago</MetricLabel>
          </div>
        ),
      },
      {
        name: 'ManifestPreview',
        desc: 'Compact YAML view with section folds — k8s manifests, fault specs, chaos-mesh CRDs.',
        status: 'Wraps Monaco',
        reference: REF_MONACO,
        preview: (
          <pre className='mock-manifest'>
            <span className='mock-manifest__line'>
              apiVersion: chaos-mesh.org/v1alpha1
            </span>
            <span className='mock-manifest__line'>kind: NetworkChaos</span>
            <span className='mock-manifest__line'>metadata:</span>
            <span
              className='mock-manifest__line'
              style={{ paddingLeft: '14px' }}
            >
              name: kafka-drift
            </span>
            <span className='mock-manifest__line'>
              spec: <span className='mock-manifest__fold'>{'{…}'}</span>
            </span>
          </pre>
        ),
      },
    ],
  },
  {
    label: 'RCA',
    cards: [
      {
        name: 'EvidenceList',
        desc: 'Ranked "what we noticed" — each row has modality icon, brief, and an Open-in button.',
        status: 'Composition',
        preview: (
          <div className='mock-evidence'>
            <div className='mock-evidence__row'>
              <StatusDot tone='warning' />
              <span className='mock-evidence__msg'>
                catalog→cart latency +480 ms
              </span>
              <Chip tone='ghost'>metric</Chip>
            </div>
            <div className='mock-evidence__row'>
              <StatusDot tone='warning' pulse />
              <span className='mock-evidence__msg'>payment 500 rate +30%</span>
              <Chip tone='ghost'>log</Chip>
            </div>
            <div className='mock-evidence__row'>
              <StatusDot tone='ink' />
              <span className='mock-evidence__msg'>
                cart DB timeout cluster
              </span>
              <Chip tone='ghost'>trace</Chip>
            </div>
          </div>
        ),
      },
      {
        name: 'AlarmEvidenceCard',
        desc: 'Templated alarm + matched conditions — pairs with the backend alarm-evidence concept.',
        status: 'Composition',
        preview: (
          <div className='mock-alarm'>
            <div className='mock-alarm__head'>
              <PanelTitle size='sm'>high_latency</PanelTitle>
              <Chip tone='warning'>matched</Chip>
            </div>
            <KeyValueList
              ruled={false}
              uppercaseKeys
              items={[
                { k: 'rule', v: 'p99 > 200ms · 5m' },
                { k: 'targets', v: 'catalog, cart' },
              ]}
            />
          </div>
        ),
      },
      {
        name: 'SuspectChip',
        desc: 'RCA root-cause candidate with confidence — used inside ranked suspect lists.',
        status: 'Extends Chip',
        preview: (
          <div className='mock-suspects'>
            <span className='mock-suspect'>
              <span>catalog</span>
              <span className='mock-suspect__pct'>92%</span>
            </span>
            <span className='mock-suspect'>
              <span>payments</span>
              <span className='mock-suspect__pct'>68%</span>
            </span>
            <span className='mock-suspect mock-suspect--low'>
              <span>cart</span>
              <span className='mock-suspect__pct'>41%</span>
            </span>
          </div>
        ),
      },
    ],
  },
];

function RoadmapCard({ name, desc, status, reference, preview }: RoadmapSpec) {
  return (
    <article className='gallery__roadmap-card'>
      <div className='gallery__roadmap-stage'>{preview}</div>
      <div className='gallery__roadmap-meta'>
        <PanelTitle size='sm'>{name}</PanelTitle>
        <p className='gallery__roadmap-desc'>{desc}</p>
        <div className='gallery__roadmap-foot'>
          <Chip tone='ghost'>{status}</Chip>
          {reference && (
            <a
              className='gallery__roadmap-link'
              href={reference.url}
              target='_blank'
              rel='noreferrer'
            >
              ↗ {reference.label}
            </a>
          )}
        </div>
      </div>
    </article>
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
          Editorial serif paired with measured mono — pure ink against an
          off‑white surface. Activation is expressed by surface inversion, not
          accent color. Anomaly red is reserved for actual anomalies.
        </p>
      </header>

      {/* ── Color tokens ───────────────────────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Color &amp; surface tokens</PanelTitle>}
      >
        <div className='gallery__swatches'>
          {COLOR_TOKENS.map((t) => (
            <div className='gallery__swatch' key={t.name}>
              <div
                className='gallery__swatch-chip'
                style={{
                  background: `var(${t.name})`,
                  outline:
                    t.value === '#FFFFFF'
                      ? '1px solid var(--border-hairline)'
                      : undefined,
                }}
              />
              <div className='gallery__swatch-meta'>
                <MonoValue size='sm' weight='regular'>
                  {t.name}
                </MonoValue>
                <MetricLabel size='xs'>{t.value}</MetricLabel>
                <span className='gallery__swatch-desc'>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Typography ─────────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Typography</PanelTitle>}>
        <div className='gallery__type-list'>
          {TYPE_SAMPLES.map((s) => (
            <div className='gallery__type-row' key={s.family}>
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

        <SectionDivider>PanelTitle scale</SectionDivider>
        <div className='gallery__stack'>
          <PanelTitle size='hero' as='h2'>
            Hero · 42
          </PanelTitle>
          <PanelTitle size='lg' as='h3'>
            Large · 24
          </PanelTitle>
          <PanelTitle size='base'>Base · 16</PanelTitle>
          <PanelTitle size='sm'>Small · 14</PanelTitle>
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
                  fields: [{ name: 'value', type: 'number', value: String(children) }],
                }),
              }}
            >
              0.142
            </MonoValue>
          </Specimen>
          <Specimen caption='lg · medium'>
            <MonoValue size='lg'>0.142</MonoValue>
          </Specimen>
        </div>

        <SectionDivider>MetricLabel</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='sm (default)'>
            <MetricLabel>last updated</MetricLabel>
          </Specimen>
          <Specimen caption='xs'>
            <MetricLabel size='xs'>2h ago</MetricLabel>
          </Specimen>
          <Specimen caption='inverted'>
            <Panel inverted padded={false}>
              <div style={{ padding: 'var(--space-3)' }}>
                <MetricLabel inverted>active</MetricLabel>
              </div>
            </Panel>
          </Specimen>
          <Specimen caption="as='div'"><MetricLabel as='div'>block label</MetricLabel></Specimen>
        </div>

        <SectionDivider>Markdown</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='inline + block'>
            <Markdown>
              {`### Quick **markdown** sample\n\n- Lists work\n- Inline \`code\` and [links](https://example.com)\n\n\`\`\`ts\nconst hello = 'world';\n\`\`\`\n\n> Blockquotes too.`}
            </Markdown>
          </Specimen>
        </div>

        <SectionDivider>SectionDivider</SectionDivider>
        <div className='gallery__stack'>
          <SectionDivider>Plain label</SectionDivider>
          <SectionDivider extra={<MetricLabel>extra slot</MetricLabel>}>
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

      {/* ── Surface (Panel) ────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Surface — Panel</PanelTitle>}>
        <SectionDivider>Panel</SectionDivider>
        <div className='gallery__row gallery__row--panels'>
          <Panel
            title='Default panel'
            extra={<MetricLabel>label</MetricLabel>}
            surface={{
              id: 'gallery.panel.basic',
              kind: 'panel',
              label: 'Default panel',
              askSuggestions: ['What is this panel?', 'Summarize this panel'],
              project: () => ({
                fields: [
                  { name: 'shape', type: 'string', value: 'hairline border, 16px radius' },
                ],
              }),
            }}
          >
            <p className='gallery__panel-body'>
              Hairline border, 16 px radius, ultra-subtle shadow. Title slot
              accepts string or rich node.
            </p>
          </Panel>

          <Panel
            inverted
            title={<PanelTitle size='base'>Inverted panel</PanelTitle>}
            extra={<MetricLabel inverted>active</MetricLabel>}
          >
            <p className='gallery__panel-body gallery__panel-body--inverted'>
              Surface flips to ink. Reserved for the currently-active card, not
              for accent decoration.
            </p>
          </Panel>

          <Panel padded={false} title='Unpadded'>
            <div className='gallery__panel-no-pad'>
              Body without inner padding — host owns the layout.
            </div>
          </Panel>
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
        </div>

        <SectionDivider>Chip</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='default'>
            <Chip>queued</Chip>
          </Specimen>
          <Specimen caption='ink'>
            <Chip
              tone='ink'
              surface={{
                id: 'gallery.chip.running',
                kind: 'tag',
                label: 'Status chip · running',
                askSuggestions: ['What does this status mean?'],
                project: (children) => ({
                  fields: [{ name: 'status', type: 'string', value: String(children) }],
                }),
              }}
            >
              running
            </Chip>
          </Specimen>
          <Specimen caption='warning'>
            <Chip tone='warning'>failed</Chip>
          </Specimen>
          <Specimen caption='ghost'>
            <Chip tone='ghost'>draft</Chip>
          </Specimen>
          <Specimen caption='with leading dot'>
            <Chip leading={<StatusDot pulse size={6} />}>active</Chip>
          </Specimen>
        </div>

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
                  { name: 'centerLabel', type: 'string', value: data.centerLabel ?? '' },
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
          <Specimen caption='horizontal'>
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
                    { name: 'metric', type: 'string', value: String(data.label) },
                    { name: 'value', type: 'string', value: String(data.value) },
                    { name: 'unit', type: 'string', value: String(data.unit ?? '') },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='vertical · emphasized'>
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
              <StatBlock label='throughput' value='9 384' unit='rps' inverted />
            </div>
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
                      { name: 'last', type: 'number', value: points[points.length - 1] ?? 0 },
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
            <MetricCard label='active injections' value='3' />
          </Specimen>
          <Specimen caption='value + unit'>
            <MetricCard label='latency p99' value='142' unit='ms' />
          </Specimen>
          <Specimen caption='value + sparkline'>
            <MetricCard
              label='throughput'
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
                    { name: 'metric', type: 'string', value: String(data.label) },
                    { name: 'value', type: 'string', value: String(data.value) },
                    { name: 'unit', type: 'string', value: String(data.unit ?? '') },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='inverted + sparkline'>
            <MetricCard
              label='error budget'
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
      </Panel>

      {/* ── Lists / rows ───────────────────────────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Lists &amp; rows</PanelTitle>}>
        <SectionDivider extra={<MetricLabel>click any row</MetricLabel>}>
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

        <SectionDivider>DataTable · with data</SectionDivider>
        <Specimen caption='sortable columns, hover, alignment' span={3}>
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
                align: 'right',
                render: (row) => (
                  <MonoValue size='sm'>{row.duration}</MonoValue>
                ),
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
        extra={<MetricLabel>observation · reasoning · action</MetricLabel>}
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
                    { name: 'arguments', type: 'string', value: data.arguments ?? '' },
                    { name: 'result', type: 'string', value: data.result ?? '' },
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
                    { name: 'actionType', type: 'string', value: data.actionType ?? '' },
                    { name: 'durationMs', type: 'number', value: data.durationMs ?? 0 },
                  ],
                }),
              }}
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
                { name: 'lastLine', type: 'string', value: lines[lines.length - 1]?.body ?? '' },
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
              code='{\n  "service": "catalog",\n  "metric": "latency_p99",\n  "value": 482,\n  "unit": "ms"\n}'
              surface={{
                id: 'gallery.codeblock.json',
                kind: 'code',
                label: 'JSON snippet',
                askSuggestions: ['Explain this JSON'],
                project: (data) => ({
                  fields: [
                    { name: 'language', type: 'string', value: data.language },
                    { name: 'lines', type: 'number', value: data.code.split('\n').length },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='bash' span={2}>
            <CodeBlock
              language='bash'
              code="kubectl apply -f injection.yaml\nwatch -n 1 'kubectl get pods'"
            />
          </Specimen>
        </div>
      </Panel>

      {/* ── Navigation & identity primitives ───────────────────────── */}
      <Panel title={<PanelTitle size='lg'>Navigation · Rosetta</PanelTitle>}>
        <SectionDivider>Tabs</SectionDivider>
        <RosettaTabs
          items={[
            { key: 'overview', label: 'Overview', action: GALLERY_ACTIONS.tabOverview },
            { key: 'params', label: 'Parameters' },
            { key: 'logs', label: 'Logs' },
          ]}
          defaultActiveKey='overview'
        >
          <p className='gallery__panel-body'>Tab panel content goes here.</p>
        </RosettaTabs>

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
        </div>

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
            <Avatar
              size='lg'
              name='Linus Torvalds'
              src='https://i.pravatar.cc/80?img=12'
            />
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

        <SectionDivider>TextField</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='default'>
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
                    Don&apos;t have an account?{' '}
                    <a href='#signup'>Create one</a>
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
              action={<Button type='primary'>Back to dashboard</Button>}
            />
          </Specimen>
        </div>

        <SectionDivider>DropdownMenu</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='basic'>
            <DropdownMenu
              trigger={<Chip tone='ink'>Open menu</Chip>}
              items={[
                { key: 'view', label: 'View details', action: GALLERY_ACTIONS.dropdownView },
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
        </div>

        <SectionDivider>EnvironmentSwitcher</SectionDivider>
        <EnvironmentSwitcherSpecimen />

        <SectionDivider>ProjectSelector</SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='with projects' span={2}>
            <ProjectSelector
              projects={[
                { id: '1', name: 'catalog-service', action: GALLERY_ACTIONS.projectSelect },
                { id: '2', name: 'order-platform' },
                { id: '3', name: 'inventory-v2' },
              ]}
              selectedId='1'
              onSelect={() => {
                /* gallery specimen — no-op */
              }}
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
        </div>

        <SectionDivider>FormRow</SectionDivider>
        <div className='gallery__stack'>
          <FormRow label='Display name' description='Shown across the platform.'>
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
                <NotificationBell inboxPath='/inbox' action={GALLERY_ACTIONS.notifOpen} />
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
                    { name: 'content', type: 'string', value: String(data.content) },
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
                    { name: 'commandId', type: 'string', value: data.commandId },
                    { name: 'status', type: 'string', value: String(data.status ?? '') },
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
          <Specimen caption='multi-role · with footer typing indicator' span={3}>
            <div className='gallery__agent-frame'>
              <ChatMessageList
                autoScroll={false}
                footer={
                  <MetricLabel size='xs'>Aegis Assistant is typing…</MetricLabel>
                }
                surface={{
                  id: 'gallery.chatlist.demo',
                  kind: 'chat',
                  label: 'Chat transcript',
                  askSuggestions: ['Summarize the conversation'],
                  project: (count) => ({
                    fields: [{ name: 'messageCount', type: 'number', value: count }],
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
          <Specimen caption='comfortable · long titles · first selected' span={2}>
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
              footer={
                <ChatComposer onSend={() => undefined} sending={false} />
              }
              surface={{
                id: 'gallery.agentpanel',
                kind: 'panel',
                label: 'Agent panel',
                askSuggestions: ['What is this agent doing?'],
                project: () => ({
                  fields: [{ name: 'agent', type: 'string', value: 'Aegis Assistant' }],
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
                  files.map((f) => f.name),
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
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-14)' }}>
                  Drop a folder or click to select one
                </span>
              }
            />
          </Specimen>
          <Specimen caption='overlay variant (contained)' span={2}>
            <div style={{ position: 'relative', height: 200, border: 'var(--size-hairline) dashed var(--border-emphasis)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                <MetricLabel>underlying content</MetricLabel>
              </div>
              <FileDropzone
                onDrop={() => undefined}
                variant='overlay'
                hint={
                  <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-14)' }}>
                    Drop files to upload
                  </span>
                }
              />
            </div>
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>standalone queue</MetricLabel>}>
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
                  file: new File(new Array(50 * 1024 * 1024).fill(0), 'corpus-2026-04.tar.gz'),
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

        <SectionDivider extra={<MetricLabel>blob bucket summary</MetricLabel>}>
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
              left={<SearchInput value='' onChange={() => undefined} placeholder='Search objects…' kbd='⌘K' />}
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

        <SectionDivider extra={<MetricLabel>single-line search</MetricLabel>}>
          SearchInput
        </SectionDivider>
        <div className='gallery__row'>
          <Specimen caption='empty with kbd hint'>
            <SearchInput value='' onChange={() => undefined} placeholder='Search…' kbd='⌘K' />
          </Specimen>
          <Specimen caption='populated with clear'>
            <SearchInput value='trace-snapshot.json' onChange={() => undefined} onClear={() => undefined} />
          </Specimen>
          <Specimen caption='no kbd, no value'>
            <SearchInput value='' onChange={() => undefined} placeholder='Filter by prefix…' />
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>key/value metadata</MetricLabel>}>
          MetadataList
        </SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='mixed entries' span={2}>
            <MetadataList
              entries={[
                { label: 'Key', value: 'datasets/2026-05/trace.json', mono: true, copyable: true },
                { label: 'Size', value: '4.2 MB', mono: true },
                { label: 'Content-Type', value: 'application/json', mono: true, copyable: true },
                { label: 'Last modified', value: '2026-05-14 08:21 UTC' },
                { label: 'ETag', value: '"a3f29c8d0e11b7ce2a4f1d6e90b5a823"', mono: true, copyable: true },
                { label: 'Storage class', value: 'STANDARD' },
              ]}
            />
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>object side-panel</MetricLabel>}>
          ObjectInspector
        </SectionDivider>
        <ObjectInspectorSpecimen />

        <SectionDivider extra={<MetricLabel>prefix tree + table shell</MetricLabel>}>
          ObjectBrowser
        </SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='browse a prefix · 2 selected' span={3}>
            <ObjectBrowser
              prefixes={['datasets/2026-04/', 'datasets/2026-05/', 'datasets/archive/']}
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
                <MetricLabel>host renders DataTable here</MetricLabel>
              </div>
            </ObjectBrowser>
          </Specimen>
          <Specimen caption='searchSlot + viewModeSlot + footer' span={3}>
            <ObjectBrowser
              prefixes={['models/', 'experiments/']}
              currentPrefix=''
              onPrefixChange={() => undefined}
              searchSlot={<SearchInput value='' onChange={() => undefined} placeholder='Filter objects…' />}
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
                  hint={<span style={{ fontFamily: 'var(--font-ui)', fontWeight: 'var(--fw-medium)' }}>Drop files to upload</span>}
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
                <MetricLabel>drag a file over this area</MetricLabel>
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
                <MetricLabel>collapsed tree</MetricLabel>
              </div>
            </ObjectBrowser>
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>presigned GET</MetricLabel>}>
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
        </div>

        <SectionDivider extra={<MetricLabel>mime-aware</MetricLabel>}>
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
                    { name: 'mimeType', type: 'string', value: data.mimeType ?? '' },
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
                    { name: 'lines', type: 'number', value: data.value.split('\n').length },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='yaml · read-only' span={2}>
            <CodeEditor
              value={'service: aegis-configcenter\nport: 8087\netcd:\n  endpoints:\n    - localhost:2379\n'}
              language='yaml'
              readOnly
              height={160}
            />
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>react-diff-viewer-continued</MetricLabel>}>
          DiffViewer
        </SectionDivider>
        <div className='gallery__stack'>
          <Specimen caption='split · json revision' span={3}>
            <DiffViewer
              oldValue={'{\n  "max_qps": 100,\n  "burst": 200\n}'}
              newValue={'{\n  "max_qps": 250,\n  "burst": 500,\n  "shadow": true\n}'}
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
                    { name: 'oldLines', type: 'number', value: data.oldValue.split('\n').length },
                    { name: 'newLines', type: 'number', value: data.newValue.split('\n').length },
                  ],
                }),
              }}
            />
          </Specimen>
          <Specimen caption='unified · diff-only' span={3}>
            <DiffViewer
              oldValue={'service: aegis-blob\nport: 8085\nbuckets:\n  - name: scratch\n    driver: localfs\n'}
              newValue={'service: aegis-blob\nport: 8085\nbuckets:\n  - name: scratch\n    driver: localfs\n  - name: artifacts\n    driver: s3\n'}
              splitView={false}
              showDiffOnly
            />
          </Specimen>
        </div>

        <SectionDivider extra={<MetricLabel>configcenter audit</MetricLabel>}>
          Timeline
        </SectionDivider>
        <div className='gallery__row gallery__row--wide'>
          <Specimen caption='audit log · mixed actors' span={3}>
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
                  meta: <MonoValue>rev 47</MonoValue>,
                },
                {
                  id: '2',
                  title: 'service-token (gateway) read auth.jwt_audience',
                  timestamp: '2026-05-12 08:55:31',
                  meta: <MonoValue>rev 46</MonoValue>,
                },
                {
                  id: '3',
                  title: 'bob@aegis created namespace ratelimit',
                  description: 'seeded 4 keys from defaults.toml',
                  timestamp: '2026-05-11 18:02:11',
                  meta: <MonoValue>rev 45</MonoValue>,
                  dotColor: 'var(--presence-online)',
                },
              ]}
            />
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
          <Specimen caption='span hierarchy + inline gantt' span={3}>
            <TraceTreeSpecimen />
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

        <SectionDivider extra={<MetricLabel>vertical layout</MetricLabel>}>
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
          app via <code>useRegisterCommands</code>. Press{' '}
          <code>⌘K</code> / <code>Ctrl+K</code> to toggle, or click the button
          below.
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
        <SectionDivider extra={<MetricLabel>right-click · Cmd/Ctrl + .</MetricLabel>}>
          AskOverlay · AskPanel
        </SectionDivider>
        <AskAffordanceSpecimen />
      </Panel>

      {/* ── Roadmap · planned components ───────────────────────────── */}
      <Panel
        title={<PanelTitle size='lg'>Roadmap · planned components</PanelTitle>}
        extra={<MetricLabel>experiment-observation page</MetricLabel>}
      >
        <p className='gallery__panel-body'>
          Composition + wrapper layer for the multimodal experiment view — logs,
          traces, metrics, code and config bound on a shared time axis. Each
          card is a placeholder; the link points at the implementation pattern
          we&apos;ll build on.
        </p>
        {ROADMAP_GROUPS.map((group) => (
          <div key={group.label}>
            <SectionDivider>{group.label}</SectionDivider>
            <div className='gallery__roadmap-grid'>
              {group.cards.map((card) => (
                <RoadmapCard key={card.name} {...card} />
              ))}
            </div>
          </div>
        ))}
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
          <MetricLabel>switcher hidden when ≤1 env</MetricLabel>
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
          <MetricLabel>switcher hidden when no envs</MetricLabel>
        </div>
      </Specimen>
    </div>
  );
}

/* ── Commands gallery specimen ─────────────────────────────────────── */

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
        <AegisButton onClick={() => setOpen(true)}>Open ObjectInspector</AegisButton>
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
                    { label: 'Key', value: 'datasets/2026-05/trace-snapshot.json', mono: true, copyable: true },
                    { label: 'Size', value: '4.2 MB', mono: true },
                    { label: 'Content-Type', value: 'application/json', mono: true },
                    { label: 'Last modified', value: '2026-05-14 08:21 UTC' },
                    { label: 'ETag', value: '"a3f29c8d0e11b7ce2a4f1d6e90b5a823"', mono: true, copyable: true },
                  ]}
                />
              ),
            },
            {
              id: 'preview',
              label: 'Preview',
              content: (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
                  Preview placeholder — host renders FilePreview here.
                </div>
              ),
            },
            {
              id: 'parquet',
              label: 'Parquet',
              content: (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
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
              { name: 'columnCount', type: 'number', value: data.columns.length },
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
    name: 'agentm.session',
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
    name: 'agentm.llm.request',
    startMs: 18,
    durationMs: 642,
    status: 'ok',
    kind: 'llm',
  },
  {
    id: 't0-tool',
    parentId: 't0',
    name: 'agentm.tool.execute · bash',
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
    name: 'agentm.llm.request',
    startMs: 945,
    durationMs: 410,
    status: 'ok',
    kind: 'llm',
  },
  {
    id: 't1-tool',
    parentId: 't1',
    name: 'agentm.tool.execute · http_get',
    startMs: 1360,
    durationMs: 455,
    status: 'error',
    kind: 'tool',
  },
];

function TraceTreeSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string>('t1-tool');
  return (
    <TraceTree
      spans={traceTreeDemoSpans}
      selectedId={selected}
      onSelect={(s) => setSelected(s.id)}
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
          .filter(
            (c) => c.id.includes(q) || c.label.toLowerCase().includes(q),
          )
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
    [],
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
    rt._setSelection(
      selectedId ? [{ id: selectedId, type: 'dataset' }] : [],
    );
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
          2,
        ),
      );
      setInspectEntityText(
        JSON.stringify(
          rt.inspect({ kind: 'entity', entityId: 'ds-001' }),
          null,
          2,
        ),
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
    anchorEl?: HTMLElement | null,
  ) => void;
}

function AskAffordanceSpecimen(): ReactNode {
  const [log, setLog] = useState<string[]>([]);

  const askRows = useMemo(
    () => [
      { id: 'ask-row-1', label: 'imagenet-mini' },
      { id: 'ask-row-2', label: 'wikitext-v3' },
    ],
    [],
  );
  const askOptOutRows = useMemo(
    () => [{ id: 'ask-optout-1', label: 'opt-out · ask disabled' }],
    [],
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
      '[data-ask-demo-row="ask-row-1"]',
    );
    w.__aegisOpenAskPanel?.(
      { origin: 'entity', surfaceId: 'gallery.ask.demo', entityId: 'ask-row-1' },
      anchor,
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
