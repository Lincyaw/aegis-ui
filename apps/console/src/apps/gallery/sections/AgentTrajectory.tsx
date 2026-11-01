import { type ReactNode, useState } from 'react';

import {
  Button as AegisButton,
  ContentInspectorDialog,
  ContentPreview,
  type InspectableContent,
  MetricLabel,
  Panel,
  PanelTitle,
  SectionDivider,
  SessionRunOutputView,
  SessionRunTrajectoryView,
  ToolCallCard,
  type ToolCallData,
  TrajectoryStep,
  type TrajectoryStepData,
  TrajectoryTimeline,
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

      <SectionDivider>ContentInspectorDialog · ContentPreview</SectionDivider>
      <ContentInspectorSpecimen />

      <SectionDivider>SessionRunView</SectionDivider>
      <SessionRunViewSpecimen />
    </Panel>
  );
}
