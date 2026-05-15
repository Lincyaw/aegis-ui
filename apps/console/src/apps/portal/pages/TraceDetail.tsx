import { Link, useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  PageHeader,
  Panel,
  PanelTitle,
  useAppHref,
} from '@lincyaw/aegis-ui';

export default function TraceDetail() {
  const { projectId, traceId } = useParams<{
    projectId: string;
    traceId: string;
  }>();
  const href = useAppHref();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Trace ${traceId}`}
        description={`Distributed trace detail for project ${projectId}.`}
      />
      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'originating injection',
              v: (
                <Link to={href(`projects/${projectId}/injections/inj-9921`)}>
                  inj-9921
                </Link>
              ),
            },
          ]}
        />
      </Panel>
      <Panel>
        <EmptyState
          title='Trace detail'
          description='Trace spans, service dependencies, and latency breakdown will appear here.'
        />
      </Panel>
    </div>
  );
}
