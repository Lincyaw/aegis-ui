import {
  Chip,
  DataTable,
  MetricCard,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  StatusDot,
  Terminal,
  type TerminalLine,
  TimeDisplay,
  type TrajectoryStepData,
  TrajectoryTimeline,
} from '@lincyaw/aegis-ui';

import { useActiveProjectId, useMockStore } from '../mocks';
import type { MockInjection } from '../mocks/types';

import './Dashboard.css';

const DEMO_TRAJECTORY: TrajectoryStepData[] = [
  {
    step: 1,
    timestamp: '14:22:01',
    durationMs: 1240,
    actionType: 'tool_call',
    action: 'query_metrics(service="catalog", metric="latency_p99")',
    thought:
      'The user reports **high latency** in the catalog service. I should first check the `p99 latency` metric to quantify the severity.',
    toolCall: {
      name: 'query_metrics',
      arguments: '{\n  "service": "catalog",\n  "metric": "latency_p99"\n}',
      result: '{\n  "value": 2840,\n  "unit": "ms"\n}',
    },
    observation: '> **Observation**: p99 latency spiked to **2.84 s**.',
  },
  {
    step: 2,
    timestamp: '14:22:08',
    durationMs: 2100,
    actionType: 'message',
    action: 'Report RCA conclusion',
    observation: '> **Root Cause**: Missing index on `inventory.sku`.',
  },
];

const DEMO_TERMINAL_LINES: TerminalLine[] = [
  { ts: '14:22:01', prefix: 'agent', level: 'info', body: 'query_metrics → catalog.latency_p99' },
  { ts: '14:22:02', prefix: 'metric', level: 'info', body: 'p99=2840ms baseline=120ms' },
  { ts: '14:22:08', prefix: 'agent', level: 'warn', body: 'RCA conclusion → missing index' },
];

export default function Dashboard() {
  const activeProjectId = useActiveProjectId();
  const project = useMockStore((s) =>
    s.projects.find((p) => p.id === activeProjectId),
  );
  const injections = useMockStore((s) =>
    s.injections.filter((i) => i.projectId === activeProjectId),
  );
  const traces = useMockStore((s) =>
    s.traces.filter((t) => t.projectId === activeProjectId),
  );
  const tasks = useMockStore((s) => s.tasks);

  const runningTasks = tasks.filter((t) => t.status === 'running').length;
  const recentInjectionIds = new Set(injections.map((i) => i.id));
  const projectTasks = tasks.filter(
    (t) =>
      t.kind === 'injection' && t.parentId !== null && recentInjectionIds.has(t.parentId),
  );

  return (
    <div className='page-wrapper dashboard'>
      <header className='dashboard__header'>
        <div className='dashboard__header-left'>
          <h1 className='dashboard__title'>
            <PanelTitle size='hero' as='span'>
              {project?.name ?? 'Dashboard'}
            </PanelTitle>
          </h1>
          <MetricLabel>
            AegisLab · use the project switcher in the header to scope this view
          </MetricLabel>
        </div>
        <div className='dashboard__header-right'>
          <Chip tone='ink'>mock</Chip>
        </div>
      </header>

      <section className='dashboard__kpi-row'>
        <MetricCard label='Injections' value={injections.length} />
        <MetricCard label='Traces' value={traces.length} />
        <MetricCard
          label='Running tasks'
          value={runningTasks}
          unit={
            <span className='dashboard__kpi-live'>
              {runningTasks > 0 && <StatusDot size={6} pulse />}
              {runningTasks > 0 ? 'active' : 'idle'}
            </span>
          }
        />
        <MetricCard
          label='Project tasks'
          value={projectTasks.length}
        />
      </section>

      <section className='dashboard__two-col'>
        <Panel
          title={<PanelTitle size='base'>Recent injections</PanelTitle>}
          extra={<MetricLabel>{injections.length} total</MetricLabel>}
          className='dashboard__panel'
        >
          <DataTable<MockInjection>
            data={injections.slice(0, 6)}
            rowKey={(i) => i.id}
            columns={[
              {
                key: 'id',
                header: 'Injection',
                render: (i) => <MonoValue size='sm'>{i.id}</MonoValue>,
              },
              { key: 'sys', header: 'System', render: (i) => i.systemCode },
              {
                key: 'status',
                header: 'Status',
                render: (i) => (
                  <StatusDot
                    size={6}
                    pulse={i.status === 'running'}
                    tone={
                      i.status === 'failed'
                        ? 'warning'
                        : i.status === 'running' || i.status === 'completed'
                          ? 'ink'
                          : 'muted'
                    }
                  />
                ),
              },
              {
                key: 'created',
                header: 'Created',
                align: 'right',
                render: (i) => <TimeDisplay value={i.createdAt} />,
              },
            ]}
          />
        </Panel>

        <Panel
          title={<PanelTitle size='base'>Recent traces</PanelTitle>}
          extra={<MetricLabel>{traces.length} total</MetricLabel>}
          className='dashboard__panel'
        >
          <DataTable
            data={traces.slice(0, 6)}
            rowKey={(t) => t.id}
            columns={[
              {
                key: 'id',
                header: 'Trace',
                render: (t) => <MonoValue size='sm'>{t.id}</MonoValue>,
              },
              {
                key: 'op',
                header: 'Root op',
                render: (t) => <MonoValue size='sm'>{t.rootOperation}</MonoValue>,
              },
              {
                key: 'dur',
                header: 'Duration',
                align: 'right',
                render: (t) => <MonoValue size='sm'>{t.durationMs} ms</MonoValue>,
              },
            ]}
          />
        </Panel>
      </section>

      <section>
        <SectionDivider>Agent Trajectory · demo</SectionDivider>
        <div className='dashboard__trajectory-host'>
          <TrajectoryTimeline
            agentName='rca-agent'
            status='completed'
            totalDurationMs={4790}
            steps={DEMO_TRAJECTORY}
          />
        </div>
      </section>

      <section>
        <SectionDivider>Live Logs · demo</SectionDivider>
        <Terminal lines={DEMO_TERMINAL_LINES} />
      </section>
    </div>
  );
}
