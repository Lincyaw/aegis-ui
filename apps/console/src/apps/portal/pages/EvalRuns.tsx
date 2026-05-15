import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

interface EvalRow {
  id: string;
  model: string;
  dataset: string;
  score: string;
  status: 'Completed' | 'Running' | 'Failed';
  startedAt: string;
}

const RUNS: EvalRow[] = [
  { id: 'eval-2026-05-15-01', model: 'claude-opus-4-7', dataset: 'ts-2026-04-25-n500', score: '0.732', status: 'Completed', startedAt: '2026-05-15T06:00Z' },
  { id: 'eval-2026-05-14-03', model: 'gpt-5.4', dataset: 'hs-2026-04-30-n200', score: '0.681', status: 'Completed', startedAt: '2026-05-14T18:00Z' },
  { id: 'eval-2026-05-15-02', model: 'claude-opus-4-7', dataset: 'mixed-replay-n100', score: '—', status: 'Running', startedAt: '2026-05-15T10:00Z' },
];

export default function EvalRuns() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='LLM evaluations'
        description='RCA agent evaluation runs.'
        action={<Button tone='primary' onClick={() => navigate('eval/new')}>+ New run</Button>}
      />
      <Panel>
        <DataTable<EvalRow>
          data={RUNS}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'Run', render: (r) => <Link to={href(`eval/${r.id}`)}><MonoValue size='sm'>{r.id}</MonoValue></Link> },
            { key: 'model', header: 'Model', render: (r) => <MonoValue size='sm'>{r.model}</MonoValue> },
            { key: 'dataset', header: 'Dataset', render: (r) => <MonoValue size='sm'>{r.dataset}</MonoValue> },
            { key: 'score', header: 'Score', render: (r) => <MonoValue size='sm'>{r.score}</MonoValue> },
            { key: 'status', header: 'Status', render: (r) => <Chip tone={r.status === 'Completed' ? 'ink' : r.status === 'Failed' ? 'warning' : 'ghost'}>{r.status}</Chip> },
            { key: 'started', header: 'Started', render: (r) => <TimeDisplay value={r.startedAt} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
