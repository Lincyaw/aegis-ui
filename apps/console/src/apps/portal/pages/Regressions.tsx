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

// TODO(portal-wire): no RegressionsApi in @lincyaw/portal 1.3.0/1.4.0 — regression cases/runs have no backend surface yet; stays on mocks.
import { useMockStore } from '../mocks';
import type { MockRegressionCase } from '../mocks/types';

export default function Regressions() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const cases = useMockStore((s) => s.regressionCases);

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
        <DataTable<MockRegressionCase>
          data={cases}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'case',
              header: 'Case',
              render: (r) => (
                <Link to={href(`regression/${r.name}`)}>
                  <MonoValue size='sm'>{r.name}</MonoValue>
                </Link>
              ),
            },
            { key: 'desc', header: 'Description', render: (r) => r.description },
            {
              key: 'status',
              header: 'Last status',
              render: (r) => (
                <Chip
                  tone={
                    r.lastStatus === 'pass'
                      ? 'ink'
                      : r.lastStatus === 'fail'
                        ? 'warning'
                        : 'ghost'
                  }
                >
                  {r.lastStatus}
                </Chip>
              ),
            },
            {
              key: 'rate',
              header: 'Pass rate',
              render: (r) => (
                <MonoValue size='sm'>{(r.passRate * 100).toFixed(1)}%</MonoValue>
              ),
            },
            {
              key: 'last',
              header: 'Last run',
              render: (r) => <TimeDisplay value={r.lastRunAt} />,
            },
            { key: 'owner', header: 'Owner', render: (r) => r.owner },
            {
              key: 'run',
              header: '',
              render: (r) => (
                <Button
                  tone='secondary'
                  onClick={() => navigate(`regression/new?case=${r.id}`)}
                >
                  Run
                </Button>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
