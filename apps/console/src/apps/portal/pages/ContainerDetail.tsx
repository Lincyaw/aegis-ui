import { useParams } from 'react-router-dom';

import {
  Chip,
  DataTable,
  EmptyState,
  KeyValueList,
  Markdown,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SkeletonText,
  TimeDisplay,
} from '@lincyaw/aegis-ui';
import { ContainerType } from '@lincyaw/portal';

import { useContainer } from '../api/containers';
import { LoadError } from '../components/LoadError';
import { StatusChip } from '../components/StatusChip';

interface Copy {
  noun: string;
  notFoundTitle: string;
  description: string;
}

const COPY: Record<ContainerType, Copy> = {
  [ContainerType.Algorithm]: {
    noun: 'algorithm',
    notFoundTitle: 'Algorithm not found',
    description: 'Algorithm',
  },
  [ContainerType.Benchmark]: {
    noun: 'benchmark',
    notFoundTitle: 'Benchmark not found',
    description: 'Benchmark',
  },
  [ContainerType.Pedestal]: {
    noun: 'pedestal chart',
    notFoundTitle: 'Pedestal chart not found',
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

  if (isLoading || isError || !container) {
    return (
      <>
        <PageHeader title={`${copy.description} ${containerId ?? ''}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title={`Failed to load the ${copy.noun}`}
              notFound={{ title: copy.notFoundTitle }}
            />
          ) : (
            <EmptyState
              title={copy.notFoundTitle}
              description={`"${containerId ?? ''}" is not a ${copy.noun} id.`}
            />
          )}
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={container.name ?? '—'}
        description={copy.description}
      />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'id',
              v: <MonoValue size='sm'>{String(container.id ?? '—')}</MonoValue>,
            },
            {
              k: 'status',
              v: container.status ? (
                <StatusChip status={container.status} />
              ) : (
                '—'
              ),
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
                  <div className='page-action-row'>
                    {container.labels.map((l, i) => (
                      <Chip key={`${l.key ?? ''}-${String(i)}`} tone='ghost'>
                        {l.key}
                        {l.value ? `=${l.value}` : ''}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Panel>
      {container.readme ? (
        <Panel title={<PanelTitle size='base'>Readme</PanelTitle>}>
          <Markdown>{container.readme}</Markdown>
        </Panel>
      ) : null}
      <Panel title={<PanelTitle size='base'>Versions</PanelTitle>}>
        <DataTable
          framed={false}
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
    </>
  );
}
