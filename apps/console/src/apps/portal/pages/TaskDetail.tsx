import { Link, useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  PageHeader,
  Panel,
  PanelTitle,
  useAppHref,
} from '@lincyaw/aegis-ui';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const href = useAppHref();

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Task ${taskId}`}
        description='Task execution logs and status.'
      />
      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'kind', v: 'injection' },
            {
              k: 'injection',
              v: (
                <Link to={href('projects/default/injections/inj-9921')}>
                  inj-9921
                </Link>
              ),
            },
            {
              k: 'execution',
              v: (
                <Link to={href('projects/default/executions/exec-201')}>
                  exec-201
                </Link>
              ),
            },
            {
              k: 'regression case',
              v: <Link to={href('regression/baseline-ts')}>baseline-ts</Link>,
            },
            {
              k: 'eval run',
              v: <Link to={href('eval/eval-77')}>eval-77</Link>,
            },
          ]}
        />
      </Panel>
      <Panel>
        <EmptyState
          title='Task detail'
          description='Task logs, execution timeline, and output will appear here.'
        />
      </Panel>
    </div>
  );
}
