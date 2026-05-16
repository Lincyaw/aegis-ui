import type { ReactElement, ReactNode } from 'react';

import {
  Chip,
  DataTable,
  EmptyState,
  ErrorState,
  MetricCard,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  Skeleton,
  SkeletonText,
  StatusDot,
  Terminal,
  type TerminalLine,
  TimeDisplay,
  type TrajectoryStepData,
  TrajectoryTimeline,
} from '@lincyaw/aegis-ui';
import type {
  ExecutionExecutionResp,
  InjectionInjectionResp,
  TraceTraceResp,
} from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';

import { projectsApi } from '../api/portal-client';

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
  {
    ts: '14:22:01',
    prefix: 'agent',
    level: 'info',
    body: 'query_metrics → catalog.latency_p99',
  },
  {
    ts: '14:22:02',
    prefix: 'metric',
    level: 'info',
    body: 'p99=2840ms baseline=120ms',
  },
  {
    ts: '14:22:08',
    prefix: 'agent',
    level: 'warn',
    body: 'RCA conclusion → missing index',
  },
];

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function Dashboard(): ReactElement {
  const projectsQuery = useQuery({
    queryKey: ['portal', 'projects', 'first-page'],
    queryFn: async () => {
      const res = await projectsApi.listProjects({ page: 1, size: 20 });
      return res.data.data?.items ?? [];
    },
  });

  const firstProject = projectsQuery.data?.[0];
  const projectId = firstProject?.id;

  const dashboardQuery = useQuery({
    queryKey: ['portal', 'dashboard', projectId],
    enabled: typeof projectId === 'number',
    queryFn: async () => {
      const res = await projectsApi.getProjectDashboard({
        projectId: projectId as number,
      });
      return res.data.data;
    },
  });

  const dash = dashboardQuery.data;
  const activeProject = dash?.project ?? firstProject;
  const injections: InjectionInjectionResp[] = dash?.recent_injections ?? [];
  const traces: TraceTraceResp[] = dash?.recent_traces ?? [];
  const executions: ExecutionExecutionResp[] = dash?.recent_executions ?? [];

  const runningTasks = dash?.counts?.tasks_running ?? 0;
  const injectionCount =
    dash?.counts?.injections_total ?? activeProject?.injection_count ?? 0;
  const executionCount =
    dash?.counts?.executions_total ?? activeProject?.execution_count ?? 0;
  const tracesTotal = dash?.counts?.traces_total ?? traces.length;

  const projectsLoading = projectsQuery.isLoading;
  const projectsError = projectsQuery.error;
  const noProject = !projectsLoading && projectId === undefined;
  const dashLoading = dashboardQuery.isLoading;
  const dashError = dashboardQuery.error;

  return (
    <div className='page-wrapper dashboard'>
      <header className='dashboard__header'>
        <div className='dashboard__header-left'>
          <h1 className='dashboard__title'>
            <PanelTitle size='hero' as='span'>
              {projectsLoading ? (
                <Skeleton width={240} height={32} />
              ) : (
                (activeProject?.name ?? 'Dashboard')
              )}
            </PanelTitle>
          </h1>
          <MetricLabel>
            AegisLab · projects come from the Portal API
          </MetricLabel>
        </div>
        <div className='dashboard__header-right'>
          <Chip tone='ink'>live</Chip>
        </div>
      </header>

      {projectsError ? (
        <ErrorState
          title='Failed to load projects'
          description={errMsg(projectsError)}
        />
      ) : null}

      {noProject && !projectsError ? (
        <EmptyState
          title='No projects yet'
          description='Create a project from the Projects page to populate the dashboard.'
        />
      ) : null}

      <section className='dashboard__kpi-row'>
        <KpiCard
          label='Injections'
          loading={dashLoading || projectsLoading}
          value={injectionCount}
        />
        <KpiCard label='Traces' loading={dashLoading} value={tracesTotal} />
        <KpiCard
          label='Running tasks'
          loading={dashLoading}
          value={runningTasks}
          unit={
            <span className='dashboard__kpi-live'>
              {runningTasks > 0 ? <StatusDot size={6} pulse /> : null}
              {runningTasks > 0 ? 'active' : 'idle'}
            </span>
          }
        />
        <KpiCard
          label='Executions'
          loading={dashLoading || projectsLoading}
          value={executionCount}
        />
      </section>

      <section className='dashboard__two-col'>
        <Panel
          title={<PanelTitle size='base'>Recent injections</PanelTitle>}
          extra={<MetricLabel>{injectionCount} total</MetricLabel>}
          className='dashboard__panel'
        >
          {dashLoading ? (
            <SkeletonText lines={5} />
          ) : dashError ? (
            <ErrorState
              title='Failed to load injections'
              description={errMsg(dashError)}
            />
          ) : (
            <DataTable<InjectionInjectionResp>
              data={injections.slice(0, 6)}
              rowKey={(i) => String(i.id ?? '')}
              columns={[
                {
                  key: 'id',
                  header: 'Injection',
                  render: (i) => (
                    <MonoValue size='sm'>{String(i.id ?? '—')}</MonoValue>
                  ),
                },
                {
                  key: 'name',
                  header: 'Name',
                  render: (i) => i.name ?? i.fault_type ?? '—',
                },
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
                  render: (i) =>
                    i.created_at ? <TimeDisplay value={i.created_at} /> : '—',
                },
              ]}
            />
          )}
        </Panel>

        <Panel
          title={<PanelTitle size='base'>Recent traces</PanelTitle>}
          extra={<MetricLabel>{tracesTotal} total</MetricLabel>}
          className='dashboard__panel'
        >
          {dashLoading ? (
            <SkeletonText lines={5} />
          ) : dashError ? (
            <ErrorState
              title='Failed to load traces'
              description={errMsg(dashError)}
            />
          ) : (
            <DataTable<TraceTraceResp>
              data={traces.slice(0, 6)}
              rowKey={(t) => String(t.id ?? '')}
              columns={[
                {
                  key: 'id',
                  header: 'Trace',
                  render: (t) => (
                    <MonoValue size='sm'>{String(t.id ?? '—')}</MonoValue>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (t) => (
                    <MonoValue size='sm'>{t.type ?? '—'}</MonoValue>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'right',
                  render: (t) => (
                    <MonoValue size='sm'>{t.status ?? '—'}</MonoValue>
                  ),
                },
              ]}
            />
          )}
        </Panel>
      </section>

      <section>
        <SectionDivider>Recent executions</SectionDivider>
        {dashLoading ? (
          <SkeletonText lines={5} />
        ) : dashError ? (
          <ErrorState
            title='Failed to load executions'
            description={errMsg(dashError)}
          />
        ) : executions.length === 0 ? (
          <EmptyState title='No executions yet' />
        ) : (
          <DataTable<ExecutionExecutionResp>
            data={executions.slice(0, 6)}
            rowKey={(e) => String(e.id ?? '')}
            columns={[
              {
                key: 'id',
                header: 'Execution',
                render: (e) => (
                  <MonoValue size='sm'>{String(e.id ?? '—')}</MonoValue>
                ),
              },
              {
                key: 'algorithm',
                header: 'Algorithm',
                render: (e) => e.algorithm_name ?? '—',
              },
              { key: 'state', header: 'State', render: (e) => e.state ?? '—' },
              {
                key: 'status',
                header: 'Status',
                align: 'right',
                render: (e) => (
                  <MonoValue size='sm'>{e.status ?? '—'}</MonoValue>
                ),
              },
            ]}
          />
        )}
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

interface KpiCardProps {
  label: string;
  value: number;
  loading?: boolean;
  unit?: ReactNode;
}

function KpiCard({ label, value, loading, unit }: KpiCardProps): ReactElement {
  if (loading) {
    return (
      <Panel className='dashboard__panel'>
        <MetricLabel>{label}</MetricLabel>
        <Skeleton block height={32} />
      </Panel>
    );
  }
  return <MetricCard label={label} value={value} unit={unit} />;
}
