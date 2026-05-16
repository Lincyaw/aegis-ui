import { useParams } from 'react-router-dom';

import {
  Breadcrumb,
  EmptyState,
  PageHeader,
  Panel,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { useEvaluation } from '../api/hooks/useEvaluations';

export default function EvalCaseDetail() {
  const { runId, caseId } = useParams<{ runId: string; caseId: string }>();
  const href = useAppHref();
  const id = runId ? Number(runId) : undefined;
  const { data: run, isLoading } = useEvaluation(id);

  return (
    <div className='page-wrapper'>
      <Breadcrumb
        items={[
          { label: 'Eval runs', to: href('eval') },
          { label: runId ?? '—', to: href(`eval/${runId ?? ''}`) },
          { label: caseId ?? '—' },
        ]}
      />
      <PageHeader
        title={`Case ${caseId ?? ''}`}
        description={
          run
            ? `${run.algorithm_name}@${run.algorithm_version}`
            : isLoading
              ? 'Loading…'
              : ''
        }
      />
      <Panel>
        <EmptyState
          title='Case-level drill-down unavailable'
          description='@lincyaw/portal 1.4.0 does not expose per-case evaluation results. See run detail for aggregate metrics and the result_json payload.'
        />
      </Panel>
    </div>
  );
}
