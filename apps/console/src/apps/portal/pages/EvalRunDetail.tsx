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
  SkeletonText,
  TimeDisplay,
} from '@lincyaw/aegis-ui';

import { useEvaluation } from '../api/evaluations';
import { LoadError } from '../components/LoadError';

function score(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(3);
}

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
    } catch (err) {
      if (!(err instanceof SyntaxError)) {
        throw err;
      }
      return run.result_json;
    }
  }, [run?.result_json]);

  if (isLoading || isError || !run) {
    return (
      <>
        <PageHeader title={`Eval ${runId ?? ''}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title='Failed to load the evaluation'
              notFound={{
                title: 'Evaluation not found',
                description: 'The run may have been removed.',
              }}
            />
          ) : (
            <EmptyState
              title='Evaluation not found'
              description={`"${runId ?? ''}" is not an evaluation id.`}
            />
          )}
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Eval #${String(run.id)}`}
        description={`${run.algorithm_name}@${run.algorithm_version} · ${run.eval_type}`}
      />

      <div className='page-overview-grid'>
        <MetricCard label='Precision' value={score(run.precision)} />
        <MetricCard label='Recall' value={score(run.recall)} />
        <MetricCard label='F1' value={score(run.f1_score)} />
        <MetricCard label='Accuracy' value={score(run.accuracy)} />
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
    </>
  );
}
