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

interface Inj {
  id: string;
  fault: string;
  target: string;
}

const CONTRIBS: Inj[] = [
  { id: 'inj-9921', fault: 'pod-failure', target: 'ts-travel-service' },
  { id: 'inj-9920', fault: 'network-delay', target: 'ts-order-service' },
  { id: 'inj-9918', fault: 'cpu-stress', target: 'ts-station-service' },
];

export default function DatasetDetail() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const href = useAppHref();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Dataset ${datasetId}`}
        description='Dataset versions and associated injections.'
        action={<Chip tone='ink'>+ New version</Chip>}
      />
      <Panel>
        <EmptyState
          title='Dataset detail'
          description='Dataset metadata, version history, and injection mappings will appear here.'
        />
      </Panel>

      <SectionDivider>Contributing injections</SectionDivider>
      <Panel>
        <DataList<Inj>
          items={CONTRIBS}
          columns={[
            {
              key: 'id',
              label: 'Injection',
              render: (r) => (
                <Link to={href(`projects/default/injections/${r.id}`)}>
                  {r.id}
                </Link>
              ),
            },
            { key: 'fault', label: 'Fault', render: (r) => r.fault },
            { key: 'target', label: 'Target', render: (r) => r.target },
          ]}
        />
      </Panel>
    </div>
  );
}
