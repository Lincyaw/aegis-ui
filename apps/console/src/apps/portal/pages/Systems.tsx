import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  StatusDot,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

interface SystemRow {
  code: string;
  name: string;
  enabled: boolean;
  pedestals: number;
  lastInjection: string;
}

const SYSTEMS: SystemRow[] = [
  { code: 'otel-demo', name: 'OpenTelemetry Demo', enabled: true, pedestals: 3, lastInjection: '2026-05-15T08:11:00Z' },
  { code: 'ts', name: 'Train-Ticket (OperationsPAI fork)', enabled: true, pedestals: 2, lastInjection: '2026-05-15T09:42:00Z' },
  { code: 'hs', name: 'Hotel Reservation (DSB Go)', enabled: true, pedestals: 1, lastInjection: '2026-05-14T22:01:00Z' },
  { code: 'sn', name: 'Social Network (DSB C++)', enabled: true, pedestals: 1, lastInjection: '2026-05-14T18:55:00Z' },
  { code: 'mm', name: 'Media Microservices (DSB C++)', enabled: false, pedestals: 0, lastInjection: '2026-05-10T11:30:00Z' },
  { code: 'ts-fudanselab', name: 'Train-Ticket (FudanSELab upstream)', enabled: false, pedestals: 0, lastInjection: '2026-05-08T03:14:00Z' },
  { code: 'tea', name: 'TeaStore (Descartes Java)', enabled: true, pedestals: 1, lastInjection: '2026-05-13T14:20:00Z' },
  { code: 'sockshop', name: 'Sock Shop', enabled: true, pedestals: 2, lastInjection: '2026-05-15T07:00:00Z' },
];

export default function Systems() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Systems'
        description='Benchmark systems registered with the aegis control plane.'
        action={
          <Button tone='primary' onClick={() => navigate('systems/new')}>
            + Register system
          </Button>
        }
      />
      <Panel>
        <DataTable<SystemRow>
          data={SYSTEMS}
          rowKey={(r) => r.code}
          columns={[
            {
              key: 'code',
              header: 'Short code',
              render: (r) => (
                <Link to={href(`systems/${r.code}`)}>
                  <MonoValue size='sm'>{r.code}</MonoValue>
                </Link>
              ),
            },
            { key: 'name', header: 'Name', render: (r) => r.name },
            {
              key: 'enabled',
              header: 'Status',
              render: (r) => (
                <Chip tone={r.enabled ? 'ink' : 'ghost'}>
                  <StatusDot size={6} tone={r.enabled ? 'ink' : 'muted'} /> {r.enabled ? 'Enabled' : 'Disabled'}
                </Chip>
              ),
            },
            { key: 'pedestals', header: 'Pedestals', render: (r) => <MonoValue size='sm'>{r.pedestals}</MonoValue> },
            { key: 'lastInjection', header: 'Last injection', render: (r) => <TimeDisplay value={r.lastInjection} /> },
          ]}
          emptyTitle='No systems registered'
          emptyDescription='Register a benchmark to begin injecting faults.'
        />
      </Panel>
    </div>
  );
}
