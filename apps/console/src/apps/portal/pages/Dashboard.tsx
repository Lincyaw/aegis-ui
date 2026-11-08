import { Link } from 'react-router-dom';

import {
  DataTable,
  MetricCard,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  Skeleton,
  SkeletonText,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';
import type {
  ExecutionExecutionResp,
  InjectionInjectionResp,
  TraceTraceResp,
} from '@lincyaw/portal';

import { useProjectDashboard } from '../api/projects';
import { LoadError } from '../components/LoadError';
import { ProjectRequired } from '../components/ProjectRequired';
import { StatusChip } from '../components/StatusChip';
import { useActiveProject } from '../hooks/useActiveProject';

import './Dashboard.css';

const RECENT = 6;

export default function Dashboard() {
  const active = useActiveProject();
  const href = useAppHref();
  const dashboardQuery = useProjectDashboard(active.projectId);

  const { project } = active;
  const header = (
    <PageHeader
      title={project?.name ?? 'Dashboard'}
      description='Recent injections, traces and executions in the active project.'
    />
  );

  if (active.projectId === undefined) {
    return (
      <>
        {header}
        <ProjectRequired active={active} />
      </>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <>
        {header}
        <Panel>
          <LoadError
            error={dashboardQuery.error}
            title='Failed to load the dashboard'
          />
        </Panel>
      </>
    );
  }

  const dash = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;
  const counts = dash?.counts;
  const injections: InjectionInjectionResp[] = dash?.recent_injections ?? [];
  const traces: TraceTraceResp[] = dash?.recent_traces ?? [];
  const executions: ExecutionExecutionResp[] = dash?.recent_executions ?? [];

  const metric = (value: number | undefined) =>
    loading ? <Skeleton width='4ch' height='1lh' /> : (value ?? 0);
  const tasksRunning = counts?.tasks_running ?? 0;

  return (
    <>
      {header}

      <div className='page-overview-grid'>
        <MetricCard
          label='Injections'
          value={metric(counts?.injections_total ?? project?.injection_count)}
        />
        <MetricCard label='Traces' value={metric(counts?.traces_total)} />
        <MetricCard
          label='Active stages'
          value={metric(counts?.tasks_running)}
          unit={loading ? undefined : tasksRunning > 0 ? 'running' : 'idle'}
        />
        <MetricCard
          label='Executions'
          value={metric(counts?.executions_total ?? project?.execution_count)}
        />
      </div>

      <div className='dashboard__two-col'>
        <Panel
          title={<PanelTitle size='base'>Recent injections</PanelTitle>}
          extra={
            counts?.injections_total === undefined ? undefined : (
              <MetricLabel>{`${String(counts.injections_total)} total`}</MetricLabel>
            )
          }
        >
          {loading ? (
            <SkeletonText lines={5} />
          ) : (
            <DataTable<InjectionInjectionResp>
              framed={false}
              data={injections.slice(0, RECENT)}
              rowKey={(i) => i.id ?? -1}
              emptyTitle='No injections yet'
              columns={[
                {
                  key: 'id',
                  header: 'Injection',
                  render: (i) => (
                    <Link to={href(`injections/${String(i.id)}`)}>
                      <MonoValue size='sm'>{i.id}</MonoValue>
                    </Link>
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
                  render: (i) => <StatusChip status={i.state} />,
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
          extra={
            counts?.traces_total === undefined ? undefined : (
              <MetricLabel>{`${String(counts.traces_total)} total`}</MetricLabel>
            )
          }
        >
          {loading ? (
            <SkeletonText lines={5} />
          ) : (
            <DataTable<TraceTraceResp>
              framed={false}
              data={traces.slice(0, RECENT)}
              rowKey={(t) => t.id ?? ''}
              emptyTitle='No traces yet'
              columns={[
                {
                  key: 'id',
                  header: 'Trace',
                  render: (t) => <MonoValue size='sm'>{t.id ?? '—'}</MonoValue>,
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
                  render: (t) => <StatusChip status={t.state} />,
                },
              ]}
            />
          )}
        </Panel>
      </div>

      <SectionDivider>Recent executions</SectionDivider>
      {loading ? (
        <SkeletonText lines={5} />
      ) : (
        <DataTable<ExecutionExecutionResp>
          data={executions.slice(0, RECENT)}
          rowKey={(e) => e.id ?? -1}
          emptyTitle='No executions yet'
          columns={[
            {
              key: 'id',
              header: 'Execution',
              render: (e) => (
                <Link to={href(`executions/${String(e.id)}`)}>
                  <MonoValue size='sm'>{e.id}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'algorithm',
              header: 'Algorithm',
              render: (e) => e.algorithm_name ?? '—',
            },
            {
              key: 'state',
              header: 'State',
              align: 'right',
              render: (e) => <StatusChip status={e.state} />,
            },
          ]}
        />
      )}
    </>
  );
}
