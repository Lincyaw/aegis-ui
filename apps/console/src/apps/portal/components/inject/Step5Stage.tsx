import { Radio } from 'antd';

import {
  Button,
  Chip,
  DataTable,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useInjectBatch } from '../../state/inject-batch';

interface Props {
  mode: 'submit' | 'stage';
  setMode: (m: 'submit' | 'stage') => void;
}

interface StagedRow {
  index: number;
  id: string;
  systemCode: string;
  app: string;
  chaosType: string;
  durationSec: number;
}

export function Step5Stage({ mode, setMode }: Props) {
  const staged = useInjectBatch((s) => s.staged);
  const remove = useInjectBatch((s) => s.remove);
  const clear = useInjectBatch((s) => s.clear);

  const rows: StagedRow[] = staged.map((it, i) => ({
    index: i,
    id: it.id,
    systemCode: it.spec.systemCode,
    app: it.spec.app,
    chaosType: it.spec.chaosType,
    durationSec: it.spec.durationSec,
  }));

  return (
    <Panel title={<PanelTitle size='base'>5. Submit or stage</PanelTitle>}>
      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value as 'submit' | 'stage')}
        style={{ marginBottom: 'var(--space-3)' }}
      >
        <Radio value='submit'>Submit now</Radio>
        <Radio value='stage'>Stage for batch (--stage)</Radio>
      </Radio.Group>
      <MetricLabel>
        {mode === 'submit'
          ? 'On confirm: one injection is created.'
          : 'On confirm: this draft is appended to the batch and the wizard resets.'}
      </MetricLabel>

      {rows.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <div className='page-action-row' style={{ marginBottom: 'var(--space-3)' }}>
            <Chip tone='ink'>{rows.length} staged</Chip>
            <Button tone='ghost' onClick={() => clear()}>
              Clear batch
            </Button>
          </div>
          <DataTable<StagedRow>
            data={rows}
            rowKey={(r) => r.id}
            emptyTitle='No staged drafts'
            emptyDescription=''
            columns={[
              {
                key: 'sys',
                header: 'System',
                render: (r) => <MonoValue size='sm'>{r.systemCode}</MonoValue>,
              },
              { key: 'app', header: 'App', render: (r) => r.app },
              {
                key: 'type',
                header: 'Chaos type',
                render: (r) => <MonoValue size='sm'>{r.chaosType}</MonoValue>,
              },
              { key: 'dur', header: 'Duration', render: (r) => `${r.durationSec}s` },
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
        </div>
      )}
    </Panel>
  );
}
