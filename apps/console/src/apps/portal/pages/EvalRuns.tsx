import { Link } from 'react-router-dom';

import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockEvalRun } from '../mocks/types';

export default function EvalRuns() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const runs = useMockStore((s) => s.evalRuns);

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='LLM evaluations'
        description='RCA agent evaluation runs.'
        action={
          <Button tone='primary' onClick={() => navigate('eval/new')}>
            + New run
          </Button>
        }
      />
      <Panel>
        <DataTable<MockEvalRun>
          data={runs}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Run',
              render: (r) => (
                <Link to={href(`eval/${r.id}`)}>
                  <MonoValue size='sm'>{r.id}</MonoValue>
                </Link>
              ),
            },
            { key: 'model', header: 'Model', render: (r) => <MonoValue size='sm'>{r.model}</MonoValue> },
            { key: 'ds', header: 'Dataset', render: (r) => <MonoValue size='sm'>{r.datasetId}</MonoValue> },
            { key: 'n', header: 'N', render: (r) => <MonoValue size='sm'>{r.nCases}</MonoValue> },
            {
              key: 't1',
              header: 'Tier-1',
              render: (r) => <MonoValue size='sm'>{r.tier1Score.toFixed(2)}</MonoValue>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip status={r.status} />,
            },
            {
              key: 'started',
              header: 'Started',
              render: (r) => <TimeDisplay value={r.startedAt} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
