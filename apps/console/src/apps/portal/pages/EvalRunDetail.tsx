import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  DataTable,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppHref,
} from '@lincyaw/aegis-ui';

interface Pattern {
  id: string;
  name: string;
  tier: 'tier-1' | 'tier-2';
  count: number;
  share: string;
}

const PATTERNS: Pattern[] = [
  { id: 'p1', name: 'path_reachability', tier: 'tier-1', count: 42, share: '34%' },
  { id: 'p2', name: 'symptom_propagation', tier: 'tier-1', count: 28, share: '22%' },
  { id: 'p3', name: 'process_tax_signal', tier: 'tier-2', count: 18, share: '14%' },
  { id: 'p4', name: 'co_anomaly_inference', tier: 'tier-2', count: 12, share: '10%' },
];

interface Case {
  id: string;
  traceId: string;
  injection: string;
  passed: boolean;
}

const CASES: Case[] = [
  { id: 'c-001', traceId: 'tr-aa01', injection: 'inj-9921', passed: true },
  { id: 'c-002', traceId: 'tr-aa02', injection: 'inj-9920', passed: false },
  { id: 'c-003', traceId: 'tr-aa03', injection: 'inj-9919', passed: true },
];

export default function EvalRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader title={`Eval ${runId ?? ''}`} description='Per-pattern scores and case breakdown.' />

      <div className='page-overview-grid'>
        <MetricCard label='Tier-1 score' value='0.81' />
        <MetricCard label='Tier-2 score' value='0.62' />
        <MetricCard label='Path reachability' value='0.74' />
        <MetricCard label='N cases' value={500} />
      </div>

      <SectionDivider>Failure-pattern breakdown</SectionDivider>
      <Panel>
        <DataTable<Pattern>
          data={PATTERNS}
          rowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Pattern', render: (r) => <MonoValue size='sm'>{r.name}</MonoValue> },
            { key: 'tier', header: 'Tier', render: (r) => <Chip tone='ghost'>{r.tier}</Chip> },
            { key: 'count', header: 'Cases', render: (r) => r.count },
            { key: 'share', header: 'Share', render: (r) => r.share },
          ]}
        />
      </Panel>

      <SectionDivider>Cases</SectionDivider>
      <Panel title={<PanelTitle size='base'>Sampled cases</PanelTitle>}>
        <DataTable<Case>
          data={CASES}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'Case', render: (r) => <MonoValue size='sm'>{r.id}</MonoValue> },
            { key: 'trace', header: 'Trace', render: (r) => <Link to={href(`projects/default/traces/${r.traceId}`)}>{r.traceId}</Link> },
            { key: 'inj', header: 'Injection', render: (r) => <Link to={href(`projects/default/injections/${r.injection}`)}>{r.injection}</Link> },
            { key: 'pass', header: 'Result', render: (r) => <Chip tone={r.passed ? 'ink' : 'warning'}>{r.passed ? 'pass' : 'fail'}</Chip> },
          ]}
        />
      </Panel>
    </div>
  );
}
