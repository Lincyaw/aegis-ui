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
import { Spin } from 'antd';

import { usePedestals } from '../api/pedestals';

type ManagedTone = 'ink' | 'warning' | 'ghost';

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
    tone = 'warning';
  } else {
    label = 'unknown';
    tone = 'ghost';
  }
  return <Chip tone={tone}>{label}</Chip>;
}

export default function Pedestals() {
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { data, isLoading } = usePedestals(200);
  const releases = data ?? [];

  return (
    <div className='page-wrapper'>
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
        {isLoading && releases.length === 0 ? (
          <Spin />
        ) : (
          <DataTable<PedestalPedestalRelease>
            data={releases}
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
    </div>
  );
}
