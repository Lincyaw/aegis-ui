import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  CodeBlock,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
} from '@lincyaw/aegis-ui';

import { useEvaluation } from '../api/hooks/useEvaluations';

export default function EvalRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const id = runId ? Number(runId) : undefined;

  const { data: run, isLoading, isError, error } = useEvaluation(id);

  const resultText = useMemo<string | null>(() => {
    if (!run?.result_json) {
      return null;
    }
    try {
      return JSON.stringify(JSON.parse(run.result_json) as unknown, null, 2);
    } catch {
      return run.result_json;
    }
  }, [run?.result_json]);

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Loading evaluation…' />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Eval run not found' />
        <Panel>
          <EmptyState
            title={isError ? 'Failed to load' : 'Not found'}
            description={
              error instanceof Error
                ? error.message
                : 'Run may have been removed.'
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Eval #${String(run.id)}`}
        description={`${run.algorithm_name}@${run.algorithm_version} · ${run.eval_type}`}
      />

      <div className='page-overview-grid'>
        <MetricCard label='Precision' value={(run.precision ?? 0).toFixed(3)} />
        <MetricCard label='Recall' value={(run.recall ?? 0).toFixed(3)} />
        <MetricCard label='F1' value={(run.f1_score ?? 0).toFixed(3)} />
        <MetricCard label='Accuracy' value={(run.accuracy ?? 0).toFixed(3)} />
      </div>

      <SectionDivider>Run</SectionDivider>
      <Panel title={<PanelTitle size='base'>Metadata</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'algorithm',
              v: <MonoValue size='sm'>{run.algorithm_name}</MonoValue>,
            },
            {
              k: 'algorithm version',
              v: <MonoValue size='sm'>{run.algorithm_version}</MonoValue>,
            },
            {
              k: 'dataset',
              v: (
                <MonoValue size='sm'>
                  {run.dataset_name ?? '—'}
                  {run.dataset_version ? `@${run.dataset_version}` : ''}
                </MonoValue>
              ),
            },
            {
              k: 'datapack',
              v: <MonoValue size='sm'>{run.datapack_name ?? '—'}</MonoValue>,
            },
            {
              k: 'eval type',
              v: <MonoValue size='sm'>{run.eval_type}</MonoValue>,
            },
            {
              k: 'created',
              v: run.created_at ? <TimeDisplay value={run.created_at} /> : '—',
            },
            {
              k: 'updated',
              v: run.updated_at ? <TimeDisplay value={run.updated_at} /> : '—',
            },
          ]}
        />
      </Panel>

      <SectionDivider>Result</SectionDivider>
      <Panel>
        {resultText === null ? (
          <EmptyState
            title='No result payload'
            description='Evaluation has not emitted a result_json blob yet.'
          />
        ) : (
          <CodeBlock language='json' code={resultText} />
        )}
      </Panel>
    </div>
  );
}
