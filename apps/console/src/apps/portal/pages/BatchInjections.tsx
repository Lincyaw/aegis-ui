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

import { useSubmitInjection } from '../api/injections';
import { specToYaml } from '../components/inject/paramSchema';
import { useActiveProjectIdNum } from '../hooks/useActiveProject';
import { useInjectBatch } from '../state/inject-batch';

interface BatchRow {
  index: number;
  id: string;
  systemCode: string;
  app: string;
  chaosType: string;
  durationSec: number;
  addedAt: string;
  yaml: string;
}

export default function BatchInjections() {
  const pid = useActiveProjectIdNum();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const staged = useInjectBatch((s) => s.staged);
  const remove = useInjectBatch((s) => s.remove);
  const clear = useInjectBatch((s) => s.clear);
  const submitMutation = useSubmitInjection();

  const rows: BatchRow[] = staged.map((it, i) => ({
    index: i,
    id: it.id,
    systemCode: it.spec.systemCode,
    app: it.spec.app,
    chaosType: it.spec.chaosType,
    durationSec: it.spec.durationSec,
    addedAt: it.addedAt,
    yaml: specToYaml(it.spec),
  }));

  const onSubmit = (): void => {
    if (rows.length === 0) {
      return;
    }
    modal.confirm({
      title: `Submit ${rows.length} injection${rows.length === 1 ? '' : 's'}?`,
      content: 'Each staged draft becomes an injection.',
      okText: 'Submit all',
      onOk: () => {
        submitMutation.mutate(
          {
            projectId: pid,
            specs: staged.map((s) => s.spec),
            autoAllocate: true,
          },
          {
            onSuccess: () => {
              void msg.success(`${rows.length} queued`);
              clear();
              navigate('injections');
            },
            onError: (err) => {
              void msg.error(`Batch submit failed: ${err.message}`);
            },
          }
        );
      },
    });
  };

  if (rows.length === 0) {
    return (
      <div className='page-wrapper'>
        <PageHeader
          title='Batch'
          description={`Staged injections for project ${pid}.`}
        />
        <Panel>
          <EmptyState
            title='No staged drafts'
            description='Use the wizard with the Stage option.'
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Batch'
        description={`Staged injections for project ${pid}.`}
        action={
          <div className='page-action-row'>
            <Button tone='ghost' onClick={() => clear()}>
              Clear all
            </Button>
            <Button
              tone='primary'
              onClick={onSubmit}
              disabled={submitMutation.isPending}
            >
              Submit all ({rows.length})
            </Button>
          </div>
        }
      />
      <Panel title={<PanelTitle size='base'>Drafts</PanelTitle>}>
        <DataTable<BatchRow>
          data={rows}
          rowKey={(r) => r.id}
          emptyTitle='No staged drafts'
          emptyDescription=''
          columns={[
            { key: 'i', header: '#', render: (r) => r.index + 1 },
            {
              key: 'sys',
              header: 'System',
              render: (r) => <MonoValue size='sm'>{r.systemCode}</MonoValue>,
            },
            { key: 'app', header: 'App', render: (r) => r.app },
            {
              key: 'type',
              header: 'Chaos',
              render: (r) => <MonoValue size='sm'>{r.chaosType}</MonoValue>,
            },
            {
              key: 'dur',
              header: 'Duration',
              render: (r) => `${r.durationSec}s`,
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
                <Button tone='ghost' onClick={() => remove(r.index)}>
                  Remove
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={<PanelTitle size='base'>Resolved YAML</PanelTitle>}>
        <CodeBlock
          language='yaml'
          code={rows
            .map((r, i) => `# draft ${i + 1}\n${r.yaml}\n---`)
            .join('\n')}
        />
      </Panel>
    </div>
  );
}
