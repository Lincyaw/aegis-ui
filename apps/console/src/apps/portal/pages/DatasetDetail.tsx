import { App as AntdApp } from 'antd';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  DataList,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';
import type { MockInjection } from '../mocks/types';

export default function DatasetDetail() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const href = useAppHref();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const dataset = useMockStore((s) => s.datasets.find((d) => d.id === datasetId));
  const allInjections = useMockStore((s) => s.injections);

  if (!dataset) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Dataset not found' />
        <Panel>
          <EmptyState title='Not found' description='This dataset no longer exists.' />
        </Panel>
      </div>
    );
  }

  const contribs = allInjections.filter((i) => dataset.injectionIds.includes(i.id));

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={dataset.name}
        description={dataset.description}
        action={
          <div className='page-action-row'>
            <Button
              tone='primary'
              onClick={() => navigate(`eval/new?dataset=${dataset.id}`)}
            >
              Use in eval
            </Button>
            <Button
              tone='secondary'
              onClick={() => {
                void msg.success('Download started (mocked)');
              }}
            >
              Download
            </Button>
            <Button
              tone='ghost'
              onClick={() => {
                void msg.info('Regeneration queued (mocked)');
              }}
            >
              Regenerate
            </Button>
          </div>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard label='Injections' value={dataset.injectionIds.length} />
        <MetricCard label='Files' value={dataset.fileCount} />
        <MetricCard label='Size' value={`${dataset.sizeMb} MB`} />
        <MetricCard label='Created' value={<TimeDisplay value={dataset.createdAt} />} />
      </div>

      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size='sm'>{dataset.id}</MonoValue> },
            { k: 'description', v: dataset.description || '—' },
          ]}
        />
      </Panel>

      <SectionDivider>Contributing injections</SectionDivider>
      <Panel>
        {contribs.length === 0 ? (
          <EmptyState
            title='Empty dataset'
            description='Add injections from the Injections list.'
          />
        ) : (
          <DataList<MockInjection>
            items={contribs}
            columns={[
              {
                key: 'id',
                label: 'Injection',
                render: (r) => (
                  <Link to={href(`injections/${r.id}`)}>
                    {r.id}
                  </Link>
                ),
              },
              { key: 'name', label: 'Name', render: (r) => r.name },
              { key: 'sys', label: 'System', render: (r) => r.systemCode },
              { key: 'status', label: 'Status', render: (r) => r.status },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
