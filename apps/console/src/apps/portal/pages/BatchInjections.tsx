import { useState } from 'react';

import {
  Button,
  CodeBlock,
  DataTable,
  EmptyState,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';
import yaml from 'js-yaml';

import { errMsg } from '../../../api/apiClient';
import { useSubmitInjection } from '../api/injections';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectRequired } from '../components/ProjectRequired';
import { BATCH_SUBMIT_OPTIONS, toSubmitRequest } from '../domain/injectSpec';
import { useActiveProject } from '../hooks/useActiveProject';
import { type StagedInjection, useInjectBatch } from '../state/inject-batch';

function plural(count: number): string {
  return `${String(count)} injection${count === 1 ? '' : 's'}`;
}

export default function BatchInjections() {
  const active = useActiveProject();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const [confirming, setConfirming] = useState(false);

  const staged = useInjectBatch((s) => s.staged);
  const remove = useInjectBatch((s) => s.remove);
  const clear = useInjectBatch((s) => s.clear);
  const submitMutation = useSubmitInjection();

  const { projectId } = active;
  const description =
    active.project?.name === undefined
      ? 'Staged injections.'
      : `Staged injections for ${active.project.name}.`;

  if (projectId === undefined) {
    return (
      <>
        <PageHeader title='Batch' description={description} />
        <ProjectRequired active={active} />
      </>
    );
  }

  const request = toSubmitRequest(
    staged.map((s) => s.spec),
    BATCH_SUBMIT_OPTIONS
  );

  const onSubmit = (): void => {
    submitMutation.mutate(
      { projectId, request },
      {
        onSuccess: () => {
          void msg.success(`${plural(staged.length)} queued`);
          setConfirming(false);
          clear();
          navigate('injections');
        },
        onError: (err) => {
          setConfirming(false);
          void msg.error(`Batch submit failed: ${errMsg(err)}`);
        },
      }
    );
  };

  if (staged.length === 0) {
    return (
      <>
        <PageHeader title='Batch' description={description} />
        <Panel>
          <EmptyState
            title='No staged drafts'
            description='Use the wizard with the Stage option.'
            action={
              <Button tone='primary' onClick={() => navigate('inject')}>
                Open the wizard
              </Button>
            }
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title='Batch'
        description={description}
        action={
          <div className='page-action-row'>
            <Button tone='ghost' onClick={() => clear()}>
              Clear all
            </Button>
            <Button
              tone='primary'
              onClick={() => setConfirming(true)}
              disabled={submitMutation.isPending}
            >
              {`Submit all (${String(staged.length)})`}
            </Button>
          </div>
        }
      />
      <Panel title={<PanelTitle size='base'>Drafts</PanelTitle>}>
        <DataTable<StagedInjection>
          framed={false}
          data={staged}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'i',
              header: '#',
              render: (r) => staged.indexOf(r) + 1,
            },
            {
              key: 'sys',
              header: 'System',
              render: (r) => (
                <MonoValue size='sm'>{r.spec.systemCode}</MonoValue>
              ),
            },
            { key: 'app', header: 'App', render: (r) => r.spec.app },
            {
              key: 'type',
              header: 'Chaos',
              render: (r) => (
                <MonoValue size='sm'>{r.spec.chaosType}</MonoValue>
              ),
            },
            {
              key: 'dur',
              header: 'Duration',
              render: (r) => `${String(r.spec.durationSec)}s`,
            },
            {
              key: 'when',
              header: 'Added',
              render: (r) => <TimeDisplay value={r.addedAt} />,
            },
            {
              key: 'rm',
              header: '',
              render: (r) => (
                <Button tone='ghost' onClick={() => remove(staged.indexOf(r))}>
                  Remove
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={<PanelTitle size='base'>Request body</PanelTitle>}>
        <CodeBlock language='yaml' code={yaml.dump(request)} />
      </Panel>
      <ConfirmDialog
        open={confirming}
        title={`Submit ${plural(staged.length)}?`}
        description='Each staged draft becomes an injection in an auto-allocated namespace.'
        confirmLabel='Submit all'
        pending={submitMutation.isPending}
        onConfirm={onSubmit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
