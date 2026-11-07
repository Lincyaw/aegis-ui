import {
  Button,
  ChoiceCardGroup,
  DataTable,
  MonoValue,
  Panel,
  PanelTitle,
  Toolbar,
} from '@lincyaw/aegis-ui';

import { type StagedInjection, useInjectBatch } from '../../state/inject-batch';

export type SubmitMode = 'submit' | 'stage';

interface Props {
  mode: SubmitMode;
  setMode: (mode: SubmitMode) => void;
}

const MODES = [
  {
    value: 'submit',
    title: 'Submit now',
    description: 'On confirm one injection is created.',
  },
  {
    value: 'stage',
    title: 'Stage for batch',
    description:
      'On confirm this draft joins the batch and the wizard starts again.',
    meta: '--stage',
  },
];

export function Step5Stage({ mode, setMode }: Props) {
  const staged = useInjectBatch((s) => s.staged);
  const remove = useInjectBatch((s) => s.remove);
  const clear = useInjectBatch((s) => s.clear);

  return (
    <Panel title={<PanelTitle size='base'>5. Submit or stage</PanelTitle>}>
      <div className='page-stack'>
        <ChoiceCardGroup
          ariaLabel='What to do on confirm'
          value={mode}
          onChange={(value) => setMode(value === 'stage' ? 'stage' : 'submit')}
          options={MODES}
        />

        {staged.length > 0 && (
          <>
            <Toolbar
              left={
                <MonoValue size='sm'>{`${String(staged.length)} staged`}</MonoValue>
              }
              right={
                <Button tone='ghost' onClick={() => clear()}>
                  Clear batch
                </Button>
              }
            />
            <DataTable<StagedInjection>
              framed={false}
              data={staged}
              rowKey={(r) => r.id}
              columns={[
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
                  header: 'Chaos type',
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
                  key: 'rm',
                  header: '',
                  render: (r) => (
                    <Button
                      tone='ghost'
                      onClick={() =>
                        remove(staged.findIndex((s) => s.id === r.id))
                      }
                    >
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
    </Panel>
  );
}
