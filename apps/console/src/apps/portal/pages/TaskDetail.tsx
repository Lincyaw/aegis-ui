import { App as AntdApp } from 'antd';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  Terminal,
  type TerminalLine,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();

  const task = useMockStore((s) => s.tasks.find((t) => t.id === taskId));
  const cancelTask = useMockStore((s) => s.cancelTask);
  const expediteTask = useMockStore((s) => s.expediteTask);

  if (!task) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Task ${taskId ?? ''}`} />
        <Panel>
          <EmptyState title='Not found' description='No such task.' />
        </Panel>
      </div>
    );
  }

  const cancellable = task.status === 'pending' || task.status === 'running';

  const lines: TerminalLine[] = task.logs.map((l) => ({
    ts: l.ts,
    level: l.level,
    body: l.body,
  }));

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Task ${task.id}`}
        description={`${task.kind} · parent ${task.parentLabel}`}
        action={
          <div className='page-action-row'>
            <StatusChip status={task.status} />
            {cancellable && (
              <>
                <Button
                  tone='secondary'
                  onClick={() => {
                    expediteTask(task.id);
                    void msg.success('Task marked complete');
                  }}
                >
                  Expedite
                </Button>
                <Button
                  tone='ghost'
                  onClick={() => {
                    cancelTask(task.id);
                    void msg.success('Task cancelled');
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Origin</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'kind', v: task.kind },
            {
              k: 'parent',
              v: task.parentId ? (
                <Link
                  to={
                    task.kind === 'injection'
                      ? href(`injections/${task.parentId}`)
                      : task.kind === 'regression'
                        ? href(`regression/${task.parentLabel}`)
                        : href(`eval/${task.parentId}`)
                  }
                >
                  <MonoValue size='sm'>{task.parentId}</MonoValue>
                </Link>
              ) : (
                '—'
              ),
            },
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
