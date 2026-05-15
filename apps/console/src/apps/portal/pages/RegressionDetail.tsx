import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';

interface Run {
  id: string;
  taskId: string;
  status: 'pass' | 'fail' | 'running';
  startedAt: string;
  duration: string;
}

const RUNS: Run[] = [
  { id: 'r-501', taskId: 'task-9001', status: 'pass', startedAt: '2026-05-15T08:00Z', duration: '6m12s' },
  { id: 'r-500', taskId: 'task-8995', status: 'pass', startedAt: '2026-05-14T08:00Z', duration: '6m04s' },
  { id: 'r-499', taskId: 'task-8980', status: 'fail', startedAt: '2026-05-13T08:00Z', duration: '7m41s' },
];

export default function RegressionDetail() {
  const { caseName } = useParams<{ caseName: string }>();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Regression: ${caseName ?? ''}`}
        description='Run history + pass/fail matrix.'
        action={<Button tone='primary'>Run now</Button>}
      />

      <div className='page-overview-grid'>
        <MetricCard label='Runs' value={RUNS.length} />
        <MetricCard label='Pass rate' value='66.7%' />
        <MetricCard label='Avg duration' value='6m39s' />
        <MetricCard label='Last status' value={<Chip tone='ink'>pass</Chip>} />
      </div>

      <SectionDivider>Run history</SectionDivider>
      <Panel>
        <DataTable<Run>
          data={RUNS}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'Run', render: (r) => <MonoValue size='sm'>{r.id}</MonoValue> },
            { key: 'task', header: 'Task', render: (r) => <Link to={href(`tasks/${r.taskId}`)}>{r.taskId}</Link> },
            { key: 'status', header: 'Status', render: (r) => <Chip tone={r.status === 'pass' ? 'ink' : r.status === 'fail' ? 'warning' : 'ghost'}>{r.status}</Chip> },
            { key: 'started', header: 'Started', render: (r) => <TimeDisplay value={r.startedAt} /> },
            { key: 'duration', header: 'Duration', render: (r) => r.duration },
          ]}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Pass/fail matrix</PanelTitle>}>
        <DataTable
          data={[
            { dim: 'ts', d1: 'pass', d2: 'pass', d3: 'fail' },
            { dim: 'hs', d1: 'pass', d2: 'pass', d3: 'pass' },
            { dim: 'otel-demo', d1: 'pass', d2: 'pass', d3: 'pass' },
          ]}
          rowKey={(r) => r.dim}
          columns={[
            { key: 'dim', header: 'System', render: (r) => r.dim },
            { key: 'd1', header: 'r-499', render: (r) => <Chip tone={r.d1 === 'pass' ? 'ink' : 'warning'}>{r.d1}</Chip> },
            { key: 'd2', header: 'r-500', render: (r) => <Chip tone={r.d2 === 'pass' ? 'ink' : 'warning'}>{r.d2}</Chip> },
            { key: 'd3', header: 'r-501', render: (r) => <Chip tone={r.d3 === 'pass' ? 'ink' : 'warning'}>{r.d3}</Chip> },
          ]}
        />
      </Panel>
    </div>
  );
}
