import { App as AntdApp } from 'antd';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  EmptyState,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockRegressionRun } from '../mocks/types';

export default function RegressionDetail() {
  const { caseName } = useParams<{ caseName: string }>();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();

  const caseRec = useMockStore((s) =>
    s.regressionCases.find((c) => c.name === caseName),
  );
  const runs = useMockStore((s) =>
    s.regressionRuns.filter((r) => r.caseId === caseRec?.id),
  );
  const runRegression = useMockStore((s) => s.runRegression);

  if (!caseRec) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Case not found' />
        <Panel>
          <EmptyState title='Not found' description='Unknown regression case.' />
        </Panel>
      </div>
    );
  }

  const onRunNow = (): void => {
    runRegression({
      caseId: caseRec.id,
      systemCode: 'ts',
      datasetId: 'ds-ts-2026-04-25',
      concurrency: 4,
    });
    void msg.success('Regression run queued');
  };

  const avgDuration =
    runs.length > 0
      ? Math.round(
          runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length / 1000,
        )
      : 0;

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Regression: ${caseRec.name}`}
        description={caseRec.description}
        action={
          <Button tone='primary' onClick={onRunNow}>
            Run now
          </Button>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard label='Runs' value={runs.length} />
        <MetricCard label='Pass rate' value={`${(caseRec.passRate * 100).toFixed(1)}%`} />
        <MetricCard label='Avg duration' value={`${avgDuration}s`} />
        <MetricCard
          label='Last status'
          value={<Chip tone={caseRec.lastStatus === 'pass' ? 'ink' : 'warning'}>{caseRec.lastStatus}</Chip>}
        />
      </div>

      <SectionDivider>Run history</SectionDivider>
      <Panel>
        {runs.length === 0 ? (
          <EmptyState title='No runs' description='Trigger one via Run now.' />
        ) : (
          <DataTable<MockRegressionRun>
            data={runs}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'id',
                header: 'Run',
                render: (r) => <MonoValue size='sm'>{r.id}</MonoValue>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <StatusChip status={r.status} />,
              },
              {
                key: 'pf',
                header: 'Pass / fail',
                render: (r) => (
                  <MonoValue size='sm'>
                    {r.passes} / {r.fails}
                  </MonoValue>
                ),
              },
              {
                key: 'started',
                header: 'Started',
                render: (r) => <TimeDisplay value={r.startedAt} />,
              },
              { key: 'sys', header: 'System', render: (r) => r.systemCode },
              {
                key: 'tasks',
                header: 'Tasks',
                render: (r) => (
                  <div className='page-action-row'>
                    {r.childTaskIds.slice(0, 4).map((t) => (
                      <Link key={t} to={href(`tasks/${t}`)}>
                        <MonoValue size='sm'>{t.slice(-4)}</MonoValue>
                      </Link>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Panel>

      <Panel title={<PanelTitle size='base'>Pass / fail matrix</PanelTitle>}>
        <DataTable
          data={runs.slice(0, 5).map((r) => ({
            id: r.id,
            status: r.status,
            passes: r.passes,
            fails: r.fails,
          }))}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Run',
              render: (r) => <MonoValue size='sm'>{r.id}</MonoValue>,
            },
            ...Array.from({ length: 4 }, (_, idx) => ({
              key: `child-${idx}`,
              header: `case-${idx + 1}`,
              render: (r: { id: string; status: string; passes: number; fails: number }) => (
                <Chip tone={idx < r.passes ? 'ink' : 'warning'}>
                  {idx < r.passes ? 'pass' : 'fail'}
                </Chip>
              ),
            })),
          ]}
        />
      </Panel>
    </div>
  );
}
