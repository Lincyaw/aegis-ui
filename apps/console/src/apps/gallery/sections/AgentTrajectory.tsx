import { type ReactNode, useState } from 'react';

import {
  Button as AegisButton,
  AgentHud,
  ChartLegend,
  ContentInspectorDialog,
  ContentPreview,
  type InspectableContent,
  KeyMomentCard,
  MetricLabel,
  Panel,
  PanelTitle,
  ReplayScrubber,
  ReplayStepStrip,
  ReplayTransport,
  SectionDivider,
  SeriesLabel,
  Tabs,
  ThoughtCard,
  ToolCallCard,
  type ToolCallData,
  TrajectoryStep,
  type TrajectoryStepData,
  TrajectoryTimeline,
  useReplayPlayback,
  useScrollProgress,
} from '@lincyaw/aegis-ui';

import { TOOL_QUERY_METRICS } from '../fixtures';
import { Specimen } from '../shared';

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

const REPLAY_SPEEDS = [0.5, 1, 2, 4];
const REPLAY_VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'red', label: 'Red' },
  { key: 'blue', label: 'Blue' },
];

/** One replay of the four steps above: frame, scrubber with event markers and transport. */
function ReplayPlayerSpecimen(): ReactNode {
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState('all');
  const playback = useReplayPlayback({
    count: TRAJECTORY_STEPS.length,
    speed,
    stepDurationMs: (index) => TRAJECTORY_STEPS[index]?.durationMs ?? 1000,
  });
  const step = TRAJECTORY_STEPS[playback.index];
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`play advances one step per recorded duration ÷ speed and stops at the end · arrows / Page Up / Home on the slider · view: ${view}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <Panel title={`Step ${String(step.step)}`}>
            <TrajectoryStep data={step} defaultExpanded />
          </Panel>
          <ReplayScrubber
            count={TRAJECTORY_STEPS.length}
            index={playback.index}
            onIndexChange={playback.seek}
            onScrubStart={playback.hold}
            onScrubEnd={playback.release}
            formatStep={(index) => `T${String(index + 1)}`}
            markers={[
              { index: 0, color: 'cat-3', label: 'T1 · first query' },
              { index: 2, color: 'cat-1', label: 'T3 · traces' },
              { index: 3, color: 'cat-4', label: 'T4 · report' },
            ]}
          />
          <ReplayTransport
            playing={playback.playing}
            onPlayToggle={playback.toggle}
            onPrevious={playback.previous}
            onNext={playback.next}
            canPrevious={playback.index > 0}
            canNext={playback.index < TRAJECTORY_STEPS.length - 1}
            position={`T${String(playback.index + 1)} / ${String(TRAJECTORY_STEPS.length)} · ${step.timestamp ?? ''}`}
            speed={speed}
            speeds={REPLAY_SPEEDS}
            onSpeedChange={setSpeed}
            extra={
              <Tabs
                listOnly
                size='sm'
                items={REPLAY_VIEWS}
                activeKey={view}
                onChange={setView}
              />
            }
          />
        </div>
      </Specimen>
    </div>
  );
}

const REPLAY_KINDS = {
  think: { label: 'Thinking', color: 'cat-6' },
  tool: { label: 'Tool call', color: 'cat-1' },
  edit: { label: 'Edit', color: 'cat-3' },
  check: { label: 'Check', color: 'cat-2' },
  fail: { label: 'Failure', color: 'seq' },
  goal: { label: 'Goal', color: 'cat-4' },
} as const;

type ReplayKind = keyof typeof REPLAY_KINDS;

const REPLAY_PATTERN: ReplayKind[] = [
  'think',
  'tool',
  'think',
  'think',
  'tool',
  'check',
  'think',
  'tool',
  'edit',
  'check',
];

const REPLAY_STRIP_STEPS = Array.from({ length: 38 }, (_, index) => {
  const kind: ReplayKind =
    index === 11 ? 'fail' : index === 37 ? 'goal' : REPLAY_PATTERN[index % 10];
  return {
    key: `step-${String(index + 1)}`,
    color: REPLAY_KINDS[kind].color,
    label: `#${String(index + 1)} · ${REPLAY_KINDS[kind].label}`,
    emphasis: kind === 'check' || kind === 'fail' || kind === 'goal',
  };
});

const REPLAY_LONG_STEPS = Array.from({ length: 300 }, (_, index) => {
  const kind: ReplayKind =
    index % 47 === 46
      ? 'fail'
      : index === 299
        ? 'goal'
        : REPLAY_PATTERN[index % 10];
  return {
    key: `long-${String(index + 1)}`,
    color: REPLAY_KINDS[kind].color,
    label: `#${String(index + 1)} · ${REPLAY_KINDS[kind].label}`,
    emphasis: kind === 'fail' || kind === 'goal',
  };
});

function ReplayStepStripSpecimen(): ReactNode {
  const [current, setCurrent] = useState(11);
  return (
    <div className='gallery__stack'>
      <Specimen
        caption={`bars by kind · course-changing steps taller · key moments numbered · the current step outlined · arrows move · #${String(current + 1)}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <ChartLegend
            shape='dot'
            items={Object.entries(REPLAY_KINDS).map(([key, kind]) => ({
              key,
              label: kind.label,
              color: kind.color,
            }))}
          />
          <ReplayStepStrip
            steps={REPLAY_STRIP_STEPS}
            currentIndex={current}
            onSelect={setCurrent}
            keyMoments={[3, 11, 22, 37]}
          />
        </div>
      </Specimen>
      <Specimen
        caption='300 steps · the gap narrows so every bar still draws · not selectable: a list of labelled steps'
        span={3}
      >
        <ReplayStepStrip
          steps={REPLAY_LONG_STEPS}
          keyMoments={[46, 140, 299]}
        />
      </Specimen>
    </div>
  );
}

/* One height per kind on a compact strip, from a quiet thought to a failure. */
const REPLAY_WEIGHTS: Record<ReplayKind, number> = {
  think: 0.44,
  tool: 0.56,
  edit: 0.68,
  check: 0.8,
  fail: 1,
  goal: 1,
};

const REPLAY_WEIGHTED_STEPS = REPLAY_STRIP_STEPS.map((step, index) => {
  const kind: ReplayKind =
    index === 11 ? 'fail' : index === 37 ? 'goal' : REPLAY_PATTERN[index % 10];
  return { ...step, emphasis: false, weight: REPLAY_WEIGHTS[kind] };
});

function ReplayStripCompactSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const { ref, progress } = useScrollProgress<HTMLDivElement>({
    range: 'cover',
    scrollContainer: scroller,
  });
  return (
    <div className='gallery__row'>
      <Specimen caption="size='sm' · no ticks · weight grades the bars by kind">
        <div className='gallery__stack gallery__stack--fill'>
          <ReplayStepStrip size='sm' steps={REPLAY_WEIGHTED_STEPS} />
        </div>
      </Specimen>
      <Specimen
        caption={`playhead follows the scroll · later steps dim · ${progress.toFixed(2)}`}
      >
        <div ref={setScroller} className='gallery__chart-scroller'>
          <p className='gallery__chart-scroller-spacer'>Scroll down.</p>
          <div ref={ref}>
            <ReplayStepStrip
              size='sm'
              steps={REPLAY_WEIGHTED_STEPS}
              playhead={progress}
            />
          </div>
          <div className='gallery__chart-scroller-spacer' />
        </div>
      </Specimen>
    </div>
  );
}

function KeyMomentSpecimen(): ReactNode {
  const [moment, setMoment] = useState('t31');
  return (
    <div className='gallery__moment-row'>
      <KeyMomentCard
        step='#113'
        kind='执行报错'
        color='var(--replay-error)'
        title='声称“已验证”后，执行计划在 replica 上报错'
        detail='#57 写下“binding 已生效”，但 #113 的 EXPLAIN 仍走旧计划。'
      />
      {[
        {
          key: 't23',
          step: 'T23',
          kind: '受挫',
          color: 'var(--replay-setback)',
          title: '北线一次失败的强攻',
        },
        {
          key: 't31',
          step: 'T31',
          kind: '关键决策',
          color: 'var(--replay-milestone)',
          title: '决定绕开主力去切补给',
        },
      ].map((item) => (
        <KeyMomentCard
          key={item.key}
          step={item.step}
          kind={item.kind}
          color={item.color as `var(--${string})`}
          title={item.title}
          selected={moment === item.key}
          onSelect={() => {
            setMoment(item.key);
          }}
        />
      ))}
    </div>
  );
}

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
      result: 'FileNotFoundError: /etc/redis/pool.conf',
    },
  ],
};

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

export function AgentTrajectorySection() {
  return (
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
              action: 'query_metrics(service="catalog", metric="latency_p99")',
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

      <SectionDivider
        extra={<MetricLabel>useReplayPlayback drives the step</MetricLabel>}
      >
        ReplayScrubber · ReplayTransport
      </SectionDivider>
      <ReplayPlayerSpecimen />

      <SectionDivider>ReplayStepStrip</SectionDivider>
      <ReplayStepStripSpecimen />
      <ReplayStripCompactSpecimen />

      <SectionDivider>KeyMomentCard</SectionDivider>
      <KeyMomentSpecimen />

      <SectionDivider>ThoughtCard</SectionDivider>
      <div className='gallery__moment-row'>
        <ThoughtCard
          turn='T41'
          clock='06:01'
          thought='渡口 E5 无人防守；若占住，蓝方南线补给要多走 6 格。'
          action='scout(unit=3, to="D4")'
          outcome='发现 E5 空虚'
          outcomeColor='var(--replay-tool)'
        />
        <ThoughtCard
          current
          turn='T42'
          clock='06:12'
          thought='右翼兵力薄弱，先占 E5 渡口切断补给，再回防主城。'
          action='move(unit=7, to="E5")'
          outcome='占领 E5 · +12 分'
          outcomeColor='var(--replay-milestone)'
        />
      </div>

      <SectionDivider>AgentHud</SectionDivider>
      <div className='gallery__hud-stage'>
        {[
          {
            name: 'Claude Opus 5.5',
            side: '红方',
            color: 'var(--series-anthropic)',
            score: '128',
            troops: 0.7,
            troopsText: '14 / 20',
            funds: 0.46,
            fundsText: '320',
            status: '思考中 · 已用 2.4 s / 10 s',
          },
          {
            name: 'GPT-6.1 Sol',
            side: '蓝方',
            color: 'var(--series-openai)',
            score: '96',
            troops: 0.45,
            troopsText: '9 / 20',
            funds: 0.3,
            fundsText: '210',
            status: '等待对手',
          },
        ].map((side) => (
          <AgentHud
            key={side.name}
            color={side.color as `var(--${string})`}
            agent={
              <SeriesLabel
                name={side.name}
                detail={side.side}
                color={side.color as `var(--${string})`}
              />
            }
            score={side.score}
            status={side.status}
            meters={[
              {
                key: 'troops',
                label: '兵力',
                value: side.troopsText,
                share: side.troops,
              },
              {
                key: 'funds',
                label: '资源',
                value: side.fundsText,
                share: side.funds,
              },
            ]}
          />
        ))}
      </div>

      <SectionDivider>ContentInspectorDialog · ContentPreview</SectionDivider>
      <ContentInspectorSpecimen />
    </Panel>
  );
}
