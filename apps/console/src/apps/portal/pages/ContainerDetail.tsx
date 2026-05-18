import { useParams } from 'react-router-dom';

import {
  Chip,
  DataTable,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import { ContainerType } from '@lincyaw/portal';

import { useContainer } from '../hooks/useContainers';

interface Copy {
  notFoundTitle: string;
  loadingTitle: string;
  loadingDescription: string;
  description: string;
}

const COPY: Record<ContainerType, Copy> = {
  [ContainerType.Algorithm]: {
    notFoundTitle: 'Algorithm not found',
    loadingTitle: 'Loading…',
    loadingDescription: 'Loading algorithm',
    description: 'Algorithm',
  },
  [ContainerType.Benchmark]: {
    notFoundTitle: 'Benchmark not found',
    loadingTitle: 'Loading…',
    loadingDescription: 'Loading benchmark',
    description: 'Benchmark',
  },
  [ContainerType.Pedestal]: {
    notFoundTitle: 'Pedestal chart not found',
    loadingTitle: 'Loading…',
    loadingDescription: 'Loading pedestal chart',
    description: 'Pedestal chart',
  },
};

interface ContainerDetailProps {
  containerType: ContainerType;
}

export default function ContainerDetail({
  containerType,
}: ContainerDetailProps) {
  const { containerId } = useParams<{ containerId: string }>();
  const idNum = containerId ? Number(containerId) : undefined;
  const { data: container, isLoading, isError, error } = useContainer(idNum);
  const copy = COPY[containerType];

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={copy.loadingTitle} />
        <Panel>
          <EmptyState
            title={copy.loadingDescription}
            description='Please wait.'
          />
        </Panel>
      </div>
    );
  }

  if (isError || !container) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={copy.notFoundTitle} />
        <Panel>
          <EmptyState
            title='Not found'
            description={
              isError && error instanceof Error
                ? error.message
                : copy.notFoundTitle
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader title={container.name ?? '—'} description={copy.description} />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'id',
              v: <MonoValue size='sm'>{String(container.id ?? '—')}</MonoValue>,
            },
            {
              k: 'status',
              v: container.status ? <Chip>{container.status}</Chip> : '—',
            },
            {
              k: 'visibility',
              v: container.is_public ? 'Public' : 'Private',
            },
            {
              k: 'created',
              v: container.created_at ? (
                <TimeDisplay value={container.created_at} />
              ) : (
                '—'
              ),
            },
            {
              k: 'updated',
              v: container.updated_at ? (
                <TimeDisplay value={container.updated_at} />
              ) : (
                '—'
              ),
            },
            {
              k: 'labels',
              v:
                container.labels && container.labels.length > 0 ? (
                  <>
                    {container.labels.map((l, i) => (
                      <Chip key={`${l.key ?? ''}-${String(i)}`}>
                        {l.key}
                        {l.value ? `=${l.value}` : ''}
                      </Chip>
                    ))}
                  </>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Panel>
      {container.readme ? (
        <Panel title={<PanelTitle size='base'>Readme</PanelTitle>}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {container.readme}
          </pre>
        </Panel>
      ) : null}
      <Panel title={<PanelTitle size='base'>Versions</PanelTitle>}>
        <DataTable
          data={container.versions ?? []}
          rowKey={(v) => String(v.id ?? v.name ?? '')}
          emptyTitle='No versions'
          emptyDescription='Push an image to register a version.'
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (v) => <MonoValue size='sm'>{v.name ?? '—'}</MonoValue>,
            },
            {
              key: 'image',
              header: 'Image',
              render: (v) => (
                <MonoValue size='sm'>{v.image_ref ?? '—'}</MonoValue>
              ),
            },
            {
              key: 'usage',
              header: 'Usage',
              render: (v) => v.usage ?? 0,
            },
            {
              key: 'updated',
              header: 'Updated',
              render: (v) =>
                v.updated_at ? <TimeDisplay value={v.updated_at} /> : '—',
            },
          ]}
        />
      </Panel>
    </div>
  );
}
