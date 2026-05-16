import { type ContainerContainerResp } from '@lincyaw/portal';
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

import { containerTypeLabel, useContainersList } from '../hooks/useContainers';

export default function Containers() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading, isError, error } = useContainersList();
  const containers = data?.items ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Containers'
        description='RCA algorithm + benchmark container registry.'
        action={
          <Button tone='primary' onClick={() => navigate('containers/new')}>
            + Register container
          </Button>
        }
      />
      <Panel>
        <DataTable<ContainerContainerResp>
          data={containers}
          loading={isLoading}
          rowKey={(r) => String(r.id ?? r.name ?? '')}
          emptyTitle={isError ? 'Failed to load containers' : 'No containers'}
          emptyDescription={
            isError
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : 'Register one to enable algo tasks.'
          }
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link to={href(`containers/${String(r.id ?? '')}`)}>
                  <MonoValue size='sm'>{r.name ?? '—'}</MonoValue>
                </Link>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (r) =>
                r.type !== undefined ? (
                  containerTypeLabel[r.type as unknown as 0 | 1 | 2] ??
                  String(r.type)
                ) : (
                  '—'
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
