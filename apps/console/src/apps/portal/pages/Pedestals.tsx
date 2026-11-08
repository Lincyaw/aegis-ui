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
import type { PedestalPedestalRelease } from '@lincyaw/portal';

import { usePedestals } from '../api/pedestals';
import { LoadError } from '../components/LoadError';

type ManagedTone = 'ink' | 'caution' | 'ghost';

function managedBadge(rel: PedestalPedestalRelease) {
  const managed = rel.managed === true;
  const system = rel.system ?? '';
  let label: string;
  let tone: ManagedTone;
  if (managed) {
    label = 'managed';
    tone = 'ink';
  } else if (system.length > 0) {
    label = 'name-only';
    tone = 'caution';
  } else {
    label = 'unknown';
    tone = 'ghost';
  }
  return <Chip tone={tone}>{label}</Chip>;
}

export default function Pedestals() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading, isError, error } = usePedestals(200);

  return (
    <>
      <PageHeader
        title='Pedestals'
        description='Deployed benchmark instances per system + namespace.'
        action={
          <Button tone='primary' onClick={() => navigate('pedestals/new')}>
            + Install pedestal
          </Button>
        }
      />
      <Panel>
        {isError ? (
          <LoadError error={error} title='Failed to load pedestals' />
        ) : (
          <DataTable<PedestalPedestalRelease>
            framed={false}
            loading={isLoading}
            data={data?.items ?? []}
            rowKey={(r) => `${r.namespace ?? ''}/${r.release ?? ''}`}
            emptyTitle='No pedestals'
            emptyDescription='Install one to begin injecting faults.'
            columns={[
              {
                key: 'release',
                header: 'Name',
                render: (r) => (
                  <Link to={href(`pedestals/${r.release ?? ''}`)}>
                    <MonoValue size='sm'>{r.release ?? '—'}</MonoValue>
                  </Link>
                ),
              },
              {
                key: 'namespace',
                header: 'Namespace',
                render: (r) => (
                  <MonoValue size='sm'>{r.namespace ?? '—'}</MonoValue>
                ),
              },
              {
                key: 'chart',
                header: 'Chart',
                render: (r) => r.chart ?? '—',
              },
              {
                key: 'version',
                header: 'Version',
                render: (r) => (
                  <MonoValue size='sm'>{r.chart_version ?? '—'}</MonoValue>
                ),
              },
              {
                key: 'managed',
                header: 'Status',
                render: managedBadge,
              },
              {
                key: 'deployed_at',
                header: 'Deployed at',
                render: (r) =>
                  r.deployed_at ? <TimeDisplay value={r.deployed_at} /> : '—',
              },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
