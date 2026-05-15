import { App as AntdApp } from 'antd';

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

import { specToYaml } from '../components/inject/paramSchema';
import { useActiveProjectId, useMockStore } from '../mocks';

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
  const pid = useActiveProjectId();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const staged = useMockStore((s) => s.stagedInjections.filter((it) => it.projectId === pid));
  const removeStaged = useMockStore((s) => s.removeStaged);
  const clearBatch = useMockStore((s) => s.clearBatch);
  const submitBatch = useMockStore((s) => s.submitBatch);

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
    if (rows.length === 0) return;
    modal.confirm({
      title: `Submit ${rows.length} injection${rows.length === 1 ? '' : 's'}?`,
      content: 'Each staged draft becomes an injection.',
      okText: 'Submit all',
      onOk: () => {
        const created = submitBatch(pid);
        void msg.success(`${created.length} queued`);
        navigate('injections');
      },
    });
  };

  if (rows.length === 0) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Batch' description={`Staged injections for ${pid}.`} />
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
        description={`Staged injections for ${pid}.`}
        action={
          <div className='page-action-row'>
            <Button tone='ghost' onClick={() => clearBatch()}>
              Clear all
            </Button>
            <Button tone='primary' onClick={onSubmit}>
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
            { key: 'dur', header: 'Duration', render: (r) => `${r.durationSec}s` },
            {
              key: 'when',
              header: 'Added',
              render: (r) => <TimeDisplay value={r.addedAt} />,
            },
            {
              key: 'rm',
              header: '',
              render: (r) => (
                <Button tone='ghost' onClick={() => removeStaged(r.index)}>
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
