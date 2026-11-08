import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  SkeletonText,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useDataset, useDeleteDataset } from '../api/datasets';
import { DeleteButton } from '../components/DeleteButton';
import { LoadError } from '../components/LoadError';

export default function DatasetDetail() {
  const { datasetId: rawId } = useParams<{ datasetId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const datasetId = rawId !== undefined ? Number(rawId) : undefined;
  const { data: dataset, isLoading, isError, error } = useDataset(datasetId);
  const del = useDeleteDataset();

  if (isLoading || isError || dataset?.id === undefined) {
    return (
      <>
        <PageHeader title={`Dataset ${rawId ?? ''}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title='Failed to load dataset'
              notFound={{
                title: 'Dataset not found',
                description: 'This dataset no longer exists.',
              }}
            />
          ) : (
            <EmptyState
              title='Dataset not found'
              description={`"${rawId ?? ''}" is not a dataset id.`}
            />
          )}
        </Panel>
      </>
    );
  }

  const id = dataset.id;
  const name = dataset.name ?? `Dataset #${String(id)}`;

  const versions = dataset.versions ?? [];
  const totalFiles = versions.reduce((acc, v) => acc + (v.file_count ?? 0), 0);
  const labelEntries = dataset.labels ?? [];

  return (
    <>
      <PageHeader
        title={name}
        description={dataset.description}
        action={
          <div className='page-action-row'>
            <Button
              tone='primary'
              disabled={!dataset.name}
              onClick={() =>
                navigate(
                  `eval/new?dataset=${encodeURIComponent(dataset.name ?? '')}`
                )
              }
            >
              Use in eval
            </Button>
            <DeleteButton
              tone='ghost'
              subject={`dataset ${name}`}
              onDelete={async () => {
                await del.mutateAsync(id);
                void msg.success('Dataset deleted');
                navigate('datasets');
              }}
            />
          </div>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard label='Versions' value={versions.length} />
        <MetricCard label='Files' value={totalFiles} />
        <MetricCard label='Type' value={dataset.type ?? '—'} />
        <MetricCard
          label='Created'
          value={
            dataset.created_at ? (
              <TimeDisplay value={dataset.created_at} />
            ) : (
              '—'
            )
          }
        />
      </div>

      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'id',
              v: <MonoValue size='sm'>{String(dataset.id)}</MonoValue>,
            },
            { k: 'name', v: dataset.name ?? '—' },
            { k: 'description', v: dataset.description ?? '—' },
            { k: 'visibility', v: dataset.is_public ? 'public' : 'private' },
            { k: 'status', v: dataset.status ?? '—' },
            {
              k: 'labels',
              v:
                labelEntries.length === 0 ? (
                  '—'
                ) : (
                  <div className='page-action-row'>
                    {labelEntries.map((l, idx) => (
                      <Chip
                        key={`${l.key ?? ''}-${l.value ?? ''}-${String(idx)}`}
                        tone='ghost'
                      >
                        {l.key}={l.value}
                      </Chip>
                    ))}
                  </div>
                ),
            },
          ]}
        />
      </Panel>

      <SectionDivider>Versions</SectionDivider>
      <Panel>
        {versions.length === 0 ? (
          <EmptyState
            title='No versions'
            description='Add a dataset version to populate datapacks.'
          />
        ) : (
          <KeyValueList
            items={versions.map((v) => ({
              k: (
                <MonoValue size='sm'>
                  {v.name ?? `#${String(v.id ?? '')}`}
                </MonoValue>
              ),
              v: (
                <span>
                  files: {v.file_count ?? 0}
                  {v.updated_at ? ' · updated ' : ''}
                  {v.updated_at ? <TimeDisplay value={v.updated_at} /> : null}
                </span>
              ),
            }))}
          />
        )}
      </Panel>
    </>
  );
}
