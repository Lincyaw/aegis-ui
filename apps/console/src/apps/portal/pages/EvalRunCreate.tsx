import { useState } from 'react';

import { Button, FormRow, PageHeader, Panel, TextField } from '@lincyaw/aegis-ui';

export default function EvalRunCreate() {
  const [model, setModel] = useState('claude-opus-4-7');
  const [dataset, setDataset] = useState('');
  const [n, setN] = useState('100');
  const [replay, setReplay] = useState(false);

  const submit = (): void => {
    // eslint-disable-next-line no-console
    console.log('start eval', { model, dataset, n, replay });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader title='New evaluation run' description='Launch an RCA agent eval.' />
      <Panel>
        <FormRow label='Model'>
          <TextField value={model} onChange={(e) => setModel(e.target.value)} />
        </FormRow>
        <FormRow label='Dataset'>
          <TextField value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder='ts-2026-04-25-n500' />
        </FormRow>
        <FormRow label='N cases'>
          <TextField value={n} onChange={(e) => setN(e.target.value)} />
        </FormRow>
        <FormRow label='Replay-only' description='Skip live inference, replay cached traces.'>
          <label>
            <input type='checkbox' checked={replay} onChange={(e) => setReplay(e.target.checked)} /> Enable replay
          </label>
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>Start</Button>
    </div>
  );
}
