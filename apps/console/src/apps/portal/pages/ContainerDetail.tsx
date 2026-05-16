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

import { containerTypeLabel, useContainer } from '../hooks/useContainers';

export default function ContainerDetail() {
  const { containerId } = useParams<{ containerId: string }>();
  const idNum = containerId ? Number(containerId) : undefined;
  const { data: container, isLoading, isError, error } = useContainer(idNum);

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Loading…' />
        <Panel>
          <EmptyState title='Loading container' description='Please wait.' />
        </Panel>
      </div>
    );
  }

  if (isError || !container) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Container not found' />
        <Panel>
          <EmptyState
            title='Not found'
            description={
              isError && error instanceof Error
                ? error.message
                : 'Unknown container.'
            }
          />
        </Panel>
      </div>
    );
  }

  const typeLabel =
    container.type !== undefined
      ? (containerTypeLabel[container.type as unknown as 0 | 1 | 2] ??
        String(container.type))
      : '—';

  return (
    <div className='page-wrapper'>
      <PageHeader title={container.name ?? '—'} description={typeLabel} />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'id',
              v: <MonoValue size='sm'>{String(container.id ?? '—')}</MonoValue>,
            },
            { k: 'type', v: typeLabel },
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
