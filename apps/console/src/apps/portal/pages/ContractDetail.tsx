import { useParams } from 'react-router-dom';

import {
  CodeBlock,
  DataList,
  MetricCard,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

const SPEC = `{
  "fault_type": "network",
  "action": "delay",
  "params": {
    "latency": "200ms",
    "jitter": "20ms",
    "correlation": "75",
    "direction": "to"
  },
  "selector": {
    "namespaces": ["${'${SYSTEM_NS}'}"],
    "labelSelectors": { "app": "${'${TARGET}'}" }
  }
}`;

interface CandidateRow {
  id: string;
  target: string;
  estCases: number;
}

const CANDIDATES: CandidateRow[] = [
  { id: 'c1', target: 'ts-travel-service', estCases: 12 },
  { id: 'c2', target: 'ts-order-service', estCases: 8 },
  { id: 'c3', target: 'ts-station-service', estCases: 6 },
];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className='page-wrapper'>
      <PageHeader title={`Contract ${id ?? ''}`} description='Fault contract spec, expansion, and usage stats.' />

      <div className='page-overview-grid'>
        <MetricCard label='Times used' value={487} />
        <MetricCard label='Systems' value={5} />
        <MetricCard label='Avg duration' value='90s' />
        <MetricCard label='Success rate' value='97.1%' />
      </div>

      <Panel title={<PanelTitle size='base'>Contract spec</PanelTitle>}>
        <CodeBlock language='json' code={SPEC} />
      </Panel>

      <SectionDivider>Expansion preview</SectionDivider>
      <Panel>
        <DataList<CandidateRow>
          items={CANDIDATES}
          columns={[
            { key: 'target', label: 'Target', render: (r) => r.target },
            { key: 'cases', label: 'Estimated cases', render: (r) => r.estCases },
          ]}
        />
      </Panel>
    </div>
  );
}
