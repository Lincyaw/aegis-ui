import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  DataTable,
  EmptyState,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockEvalCase } from '../mocks/types';

interface PatternRow {
  pattern: string;
  count: number;
  share: string;
}

const PATTERNS_ALL = [
  'path_reachability',
  'symptom_propagation',
  'process_tax_signal',
  'co_anomaly_inference',
  'multi_hop_reasoning',
  'temporal_alignment',
  'mysql_blind',
];

export default function EvalRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const href = useAppHref();

  const run = useMockStore((s) => s.evalRuns.find((r) => r.id === runId));
  const cases = useMockStore((s) =>
    s.evalCases.filter((c) => c.runId === runId),
  );

  const patternRows = useMemo<PatternRow[]>(() => {
    const total = cases.length || 1;
    return PATTERNS_ALL.map((p) => {
      const count = cases.filter((c) => c.pattern === p).length;
      return {
        pattern: p,
        count,
        share: `${((count / total) * 100).toFixed(0)}%`,
      };
    }).filter((p) => p.count > 0);
  }, [cases]);

  if (!run) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Eval run not found' />
        <Panel>
          <EmptyState title='Not found' description='Run may have been removed.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Eval ${run.id}`}
        description={`${run.model} · ${run.datasetId}`}
        action={<StatusChip status={run.status} />}
      />

      <div className='page-overview-grid'>
        <MetricCard label='Tier-1 score' value={run.tier1Score.toFixed(2)} />
        <MetricCard label='Tier-2 score' value={run.tier2Score.toFixed(2)} />
        <MetricCard label='Path reachability' value={run.pathReachability.toFixed(2)} />
        <MetricCard label='Completion rate' value={`${(run.completionRate * 100).toFixed(0)}%`} />
      </div>

      <SectionDivider>Failure-pattern breakdown</SectionDivider>
      <Panel>
        {patternRows.length === 0 ? (
          <EmptyState title='No cases yet' description='Run is still warming up.' />
        ) : (
          <DataTable<PatternRow>
            data={patternRows}
            rowKey={(r) => r.pattern}
            columns={[
              {
                key: 'pattern',
                header: 'Pattern',
                render: (r) => <MonoValue size='sm'>{r.pattern}</MonoValue>,
              },
              { key: 'count', header: 'Cases', render: (r) => r.count },
              { key: 'share', header: 'Share', render: (r) => r.share },
            ]}
          />
        )}
      </Panel>

      <SectionDivider>Cases</SectionDivider>
      <Panel title={<PanelTitle size='base'>{cases.length} cases</PanelTitle>}>
        <DataTable<MockEvalCase>
          data={cases}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Case',
              render: (r) => (
                <Link to={href(`eval/${run.id}/cases/${r.id}`)}>
                  <MonoValue size='sm'>{r.id}</MonoValue>
                </Link>
              ),
            },
            { key: 'tier', header: 'Tier', render: (r) => <Chip tone='ghost'>{r.tier}</Chip> },
            {
              key: 'pattern',
              header: 'Pattern',
              render: (r) => <MonoValue size='sm'>{r.pattern}</MonoValue>,
            },
            {
              key: 'score',
              header: 'Score',
              render: (r) => <MonoValue size='sm'>{r.score.toFixed(2)}</MonoValue>,
            },
            {
              key: 'result',
              header: 'Result',
              render: (r) => (
                <Chip tone={r.passed ? 'ink' : 'warning'}>{r.passed ? 'pass' : 'fail'}</Chip>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
