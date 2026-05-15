import { Link, useParams } from 'react-router-dom';

import {
  DataTable,
  EmptyState,
  MonoValue,
  PageHeader,
  Panel,
  TimeDisplay,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';
import type { MockTrace } from '../mocks/types';

export default function Traces() {
  const { projectId } = useParams<{ projectId: string }>();
  const href = useAppHref();
  const traces = useMockStore((s) =>
    s.traces.filter((t) => !projectId || t.projectId === projectId),
  );

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Traces'
        description={`Distributed traces for project ${projectId ?? ''}.`}
      />
      <Panel>
        {traces.length === 0 ? (
          <EmptyState
            title='No traces'
            description='Traces appear once an injection lands.'
          />
        ) : (
          <DataTable<MockTrace>
            data={traces}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'id',
                header: 'Trace',
                render: (r) => (
                  <Link to={href(`projects/${r.projectId}/traces/${r.id}`)}>
                    <MonoValue size='sm'>{r.id}</MonoValue>
                  </Link>
                ),
              },
              { key: 'op', header: 'Root op', render: (r) => r.rootOperation },
              {
                key: 'dur',
                header: 'Duration',
                render: (r) => <MonoValue size='sm'>{r.durationMs} ms</MonoValue>,
              },
              {
                key: 'spans',
                header: 'Spans',
                render: (r) => <MonoValue size='sm'>{r.spanCount}</MonoValue>,
              },
              {
                key: 'started',
                header: 'Started',
                render: (r) => <TimeDisplay value={r.startedAt} />,
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
