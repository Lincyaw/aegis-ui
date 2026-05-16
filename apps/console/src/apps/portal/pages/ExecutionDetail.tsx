import { useParams } from 'react-router-dom';

import {
  EmptyState,
  ErrorState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useExecutionDetail } from '../hooks/useExecutions';

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const numericId = executionId ? Number(executionId) : undefined;
  const { data, isLoading, isError, error } = useExecutionDetail(numericId);

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <EmptyState title='Loading…' description='Fetching execution.' />
        </Panel>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <ErrorState
            title='Not found'
            description={error instanceof Error ? error.message : 'Unknown execution.'}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Execution ${String(data.id ?? '')}`}
        description={`${data.algorithm_name ?? 'algorithm'} · ${data.datapack_name ?? 'datapack'}`}
        action={<StatusChip status={data.state ?? data.status ?? 'pending'} />}
      />
      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'algorithm', v: data.algorithm_name ?? '—' },
            { k: 'version', v: data.algorithm_version ?? '—' },
            {
              k: 'datapack',
              v: <MonoValue size='sm'>{data.datapack_name ?? '—'}</MonoValue>,
            },
            {
              k: 'task',
              v: <MonoValue size='sm'>{data.task_id ?? '—'}</MonoValue>,
            },
            {
              k: 'duration',
              v: data.duration != null ? `${(data.duration / 1000).toFixed(1)}s` : '—',
            },
          ]}
        />
      </Panel>
      {data.granularity_results && data.granularity_results.length > 0 && (
        <Panel title={<PanelTitle size='base'>Granularity results</PanelTitle>}>
          <KeyValueList
            items={data.granularity_results.map((g) => ({
              k: `${g.level} #${String(g.rank)}`,
              v: (
                <span>
                  <MonoValue size='sm'>{g.result}</MonoValue>
                  {g.confidence != null && ` (${(g.confidence * 100).toFixed(1)}%)`}
                </span>
              ),
            }))}
          />
        </Panel>
      )}
    </div>
  );
}
