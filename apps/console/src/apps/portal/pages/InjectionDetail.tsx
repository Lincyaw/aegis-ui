import { Link, useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  PageHeader,
  Panel,
  PanelTitle,
  useAppHref,
} from '@lincyaw/aegis-ui';

export default function InjectionDetail() {
  const { projectId, injectionId } = useParams<{
    projectId: string;
    injectionId: string;
  }>();
  const href = useAppHref();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Injection ${injectionId ?? ''}`}
        description={`Fault injection detail for project ${projectId ?? ''}.`}
      />
      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'target system', v: <Link to={href('systems/ts')}>ts</Link> },
            { k: 'contract', v: <Link to={href('contracts/ctr-pod-failure')}>pod-failure</Link> },
            { k: 'originating task', v: <Link to={href('tasks/task-9001')}>task-9001</Link> },
          ]}
        />
      </Panel>
      <Panel>
        <EmptyState
          title='Injection detail'
          description='Injection metadata, datapack files, and results will appear here.'
        />
      </Panel>
    </div>
  );
}
