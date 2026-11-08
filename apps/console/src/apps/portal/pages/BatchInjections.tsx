import { useState } from 'react';

import {
  Button,
  CodeBlock,
  DataTable,
  EmptyState,
  KeyValueList,
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
import {
  type ContainerChoice,
  type NamespaceMode,
  requestOptionsFor,
  submitOutcome,
  toSubmitRequest,
} from '../domain/injectSpec';
import { useActiveProject } from '../hooks/useActiveProject';
import { type StagedInjection, useInjectBatch } from '../state/inject-batch';

function plural(count: number): string {
  return `${String(count)} injection${count === 1 ? '' : 's'}`;
}

function containerText({ name, version }: ContainerChoice): string {
  return version === '' ? `${name} (latest)` : `${name} ${version}`;
}

const NAMESPACE_TEXT: Record<NamespaceMode, string> = {
  specific: 'the namespace named in each draft',
  auto: 'auto-allocated',
  'auto-bootstrap': 'auto-allocated, bootstrap allowed',
};

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

  const specs = staged.map((s) => s.spec);
  const options = specs.length > 0 ? requestOptionsFor(specs[0]) : undefined;

  const onSubmit = (): void => {
    if (options === undefined) {
      return;
    }
    submitMutation.mutate(
      { projectId, request: toSubmitRequest(specs, options) },
      {
        onSuccess: (resp) => {
          const outcome = submitOutcome(resp, specs.length);
          if (outcome.created === specs.length) {
            void msg.success(outcome.text);
          } else {
            void msg.warning(outcome.text);
          }
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

  if (options === undefined) {
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
      <Panel title={<PanelTitle size='base'>Shared by every draft</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'pedestal',
              v: (
                <MonoValue size='sm'>
                  {containerText(options.pedestal)}
                </MonoValue>
              ),
            },
            {
              k: 'benchmark',
              v: (
                <MonoValue size='sm'>
                  {containerText(options.benchmark)}
                </MonoValue>
              ),
            },
            { k: 'namespace', v: NAMESPACE_TEXT[options.namespaceMode] },
            {
              k: 'pedestal restart',
              v: options.skipRestartPedestal ? 'skipped' : 'restarted',
            },
          ]}
        />
      </Panel>
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
        <CodeBlock
          language='yaml'
          code={yaml.dump(toSubmitRequest(specs, options))}
        />
      </Panel>
      <ConfirmDialog
        open={confirming}
        title={`Submit ${plural(staged.length)}?`}
        description='Each draft becomes one injection. The server skips a draft that repeats another or one already injected.'
        confirmLabel='Submit all'
        pending={submitMutation.isPending}
        onConfirm={onSubmit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
