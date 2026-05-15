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

interface RegressionRow {
  caseName: string;
  lastStatus: 'pass' | 'fail' | 'running';
  passRate: string;
  lastRun: string;
  owner: string;
}

const CASES: RegressionRow[] = [
  { caseName: 'ts-baseline', lastStatus: 'pass', passRate: '98.6%', lastRun: '2026-05-15T08:00Z', owner: 'lincyaw' },
  { caseName: 'otel-cart-failure', lastStatus: 'pass', passRate: '100%', lastRun: '2026-05-15T07:00Z', owner: 'boxiyu' },
  { caseName: 'hs-network-jitter', lastStatus: 'fail', passRate: '82.4%', lastRun: '2026-05-14T22:00Z', owner: 'lincyaw' },
  { caseName: 'sn-cpu-burn', lastStatus: 'running', passRate: '—', lastRun: '2026-05-15T10:00Z', owner: 'boxiyu' },
];

export default function Regressions() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Regression suites'
        description='Pinned cases re-run after each platform change.'
        action={
          <Button tone='primary' onClick={() => navigate('regression/new')}>
            + Run case
          </Button>
        }
      />
      <Panel>
        <DataTable<RegressionRow>
          data={CASES}
          rowKey={(r) => r.caseName}
          columns={[
            { key: 'case', header: 'Case', render: (r) => <Link to={href(`regression/${r.caseName}`)}><MonoValue size='sm'>{r.caseName}</MonoValue></Link> },
            { key: 'status', header: 'Last status', render: (r) => <Chip tone={r.lastStatus === 'pass' ? 'ink' : r.lastStatus === 'fail' ? 'warning' : 'ghost'}>{r.lastStatus}</Chip> },
            { key: 'rate', header: 'Pass rate', render: (r) => <MonoValue size='sm'>{r.passRate}</MonoValue> },
            { key: 'lastRun', header: 'Last run', render: (r) => <TimeDisplay value={r.lastRun} /> },
            { key: 'owner', header: 'Owner', render: (r) => r.owner },
          ]}
        />
      </Panel>
    </div>
  );
}
