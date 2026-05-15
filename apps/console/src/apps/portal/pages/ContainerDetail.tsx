import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  DataList,
  EmptyState,
  PageHeader,
  Panel,
  SectionDivider,
  useAppHref,
} from '@lincyaw/aegis-ui';

interface Exec {
  id: string;
  startedAt: string;
}
interface Dset {
  id: string;
  name: string;
}

const EXECS: Exec[] = [
  { id: 'exec-201', startedAt: '2026-05-15T10:00Z' },
  { id: 'exec-198', startedAt: '2026-05-14T14:00Z' },
];

const USED_BY: Dset[] = [
  { id: 'ds-77', name: 'ts-baseline-2026-05' },
  { id: 'ds-74', name: 'hs-network-faults' },
];

export default function ContainerDetail() {
  const { containerId } = useParams<{ containerId: string }>();
  const href = useAppHref();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Container ${containerId}`}
        description='Container configuration and version history.'
        action={<Chip tone='ink'>+ New version</Chip>}
      />
      <Panel>
        <EmptyState
          title='Container detail'
          description='Container metadata, versions, and helm charts will appear here.'
        />
      </Panel>

      <SectionDivider>Linked executions</SectionDivider>
      <Panel>
        <DataList<Exec>
          items={EXECS}
          columns={[
            {
              key: 'id',
              label: 'Execution',
              render: (r) => (
                <Link to={href(`projects/default/executions/${r.id}`)}>
                  {r.id}
                </Link>
              ),
            },
            { key: 'startedAt', label: 'Started', render: (r) => r.startedAt },
          ]}
        />
      </Panel>

      <SectionDivider>Used by datasets</SectionDivider>
      <Panel>
        <DataList<Dset>
          items={USED_BY}
          columns={[
            {
              key: 'id',
              label: 'Dataset',
              render: (r) => (
                <Link to={href(`datasets/${r.id}`)}>{r.name}</Link>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
