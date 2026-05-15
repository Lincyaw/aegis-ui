import { useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const task = useMockStore((s) => s.tasks.find((t) => t.id === executionId));

  if (!task) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Execution ${executionId ?? ''}`} />
        <Panel>
          <EmptyState title='Not found' description='Unknown execution.' />
        </Panel>
      </div>
    );
  }

  const lines: TerminalLine[] = task.logs.map((l) => ({
    ts: l.ts,
    level: l.level,
    body: l.body,
  }));

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Execution ${task.id}`}
        description={`${task.kind} · ${task.parentLabel}`}
        action={<StatusChip status={task.status} />}
      />
      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'kind', v: task.kind },
            { k: 'parent', v: <MonoValue size='sm'>{task.parentLabel}</MonoValue> },
            { k: 'duration', v: `${(task.durationMs / 1000).toFixed(1)}s` },
          ]}
        />
      </Panel>
      <Panel title={<PanelTitle size='base'>Logs</PanelTitle>}>
        <Terminal lines={lines} />
      </Panel>
    </div>
  );
}
