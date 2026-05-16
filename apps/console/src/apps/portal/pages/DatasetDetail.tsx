import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Spin } from 'antd';

import { useDataset, useDeleteDataset } from '../api/datasets';

export default function DatasetDetail() {
  const { datasetId: rawId } = useParams<{ datasetId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const datasetId = rawId !== undefined ? Number(rawId) : undefined;
  const { data: dataset, isLoading, isError, error } = useDataset(datasetId);
  const del = useDeleteDataset();

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Loading…' />
        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 'var(--space-6)',
            }}
          >
            <Spin />
          </div>
        </Panel>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Dataset' />
        <Panel>
          <ErrorState
            title='Failed to load dataset'
            description={
              error instanceof Error ? error.message : 'Unknown error'
            }
          />
        </Panel>
      </div>
    );
  }

  if (!dataset || dataset.id === undefined) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Dataset not found' />
        <Panel>
          <EmptyState
            title='Not found'
            description='This dataset no longer exists.'
          />
        </Panel>
      </div>
    );
  }

  const versions = dataset.versions ?? [];
  const totalFiles = versions.reduce((acc, v) => acc + (v.file_count ?? 0), 0);
  const labelEntries = dataset.labels ?? [];

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={dataset.name ?? `Dataset #${String(dataset.id)}`}
        description={dataset.description}
        action={
          <div className='page-action-row'>
            <Button
              tone='primary'
              onClick={() =>
                navigate(`eval/new?dataset=${String(dataset.id ?? '')}`)
              }
            >
              Use in eval
            </Button>
            <Button
              tone='ghost'
              onClick={() => {
                if (dataset.id === undefined) {
                  return;
                }
                del.mutate(dataset.id, {
                  onSuccess: () => {
                    void msg.success('Dataset deleted');
                    navigate('datasets');
                  },
                  onError: (err) => {
                    void msg.error(
                      err instanceof Error
                        ? err.message
                        : 'Failed to delete dataset'
                    );
                  },
                });
              }}
              disabled={del.isPending}
            >
              Delete
            </Button>
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
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                      flexWrap: 'wrap',
                    }}
                  >
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
    </div>
  );
}
