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
import { type ContainerContainerResp, ContainerType } from '@lincyaw/portal';

import { useContainersList } from '../hooks/useContainers';

interface Copy {
  basePath: string;
  title: string;
  description: string;
  registerLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
}

const COPY: Record<ContainerType, Copy> = {
  [ContainerType.Algorithm]: {
    basePath: 'algorithms',
    title: 'Algorithms',
    description: 'RCA algorithm registry.',
    registerLabel: '+ Register algorithm',
    emptyTitle: 'No algorithms registered yet',
    emptyDescription: 'Register one to enable RCA execution.',
    errorTitle: 'Failed to load algorithms',
  },
  [ContainerType.Benchmark]: {
    basePath: 'benchmarks',
    title: 'Benchmarks',
    description: 'Benchmark datapack registry.',
    registerLabel: '+ Register benchmark',
    emptyTitle: 'No benchmarks registered yet',
    emptyDescription: 'Register one to enable evaluation.',
    errorTitle: 'Failed to load benchmarks',
  },
  [ContainerType.Pedestal]: {
    basePath: 'pedestal-charts',
    title: 'Pedestal charts',
    description: 'Pedestal helm chart registry.',
    registerLabel: '+ Register chart',
    emptyTitle: 'No pedestal charts registered yet',
    emptyDescription: 'Register one to enable pedestal installs.',
    errorTitle: 'Failed to load pedestal charts',
  },
};

interface ContainersProps {
  containerType: ContainerType;
}

export default function Containers({ containerType }: ContainersProps) {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const copy = COPY[containerType];
  const { data, isLoading, isError, error } = useContainersList({
    type: containerType,
  });
  const containers = data?.items ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Button
            tone='primary'
            onClick={() => navigate(`${copy.basePath}/new`)}
          >
            {copy.registerLabel}
          </Button>
        }
      />
      <Panel>
        <DataTable<ContainerContainerResp>
          data={containers}
          loading={isLoading}
          rowKey={(r) => String(r.id ?? r.name ?? '')}
          emptyTitle={isError ? copy.errorTitle : copy.emptyTitle}
          emptyDescription={
            isError
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : copy.emptyDescription
          }
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`${copy.basePath}/${String(r.id ?? '')}`)}>
                  <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) =>
                r.status ? <Chip>{r.status}</Chip> : <span>—</span>,
            },
            {
              key: 'visibility',
              header: 'Visibility',
              render: (r) => (r.is_public ? 'Public' : 'Private'),
            },
            {
              key: 'created',
              header: 'Created',
              render: (r) =>
                r.created_at ? <TimeDisplay value={r.created_at} /> : '—',
            },
          ]}
        />
      </Panel>
    </div>
  );
}
