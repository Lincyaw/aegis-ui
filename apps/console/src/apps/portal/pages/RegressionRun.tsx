import { useState } from 'react';

import { Button, FormRow, PageHeader, Panel, TextField } from '@lincyaw/aegis-ui';

export default function RegressionRun() {
  const [caseName, setCaseName] = useState('');
  const [dataset, setDataset] = useState('');
  const [system, setSystem] = useState('');

  const submit = (): void => {
    // eslint-disable-next-line no-console
    console.log('launch regression', { caseName, dataset, system });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader title='Run regression case' description='Launch a pinned case against a target system.' />
      <Panel>
        <FormRow label='Case'>
          <TextField value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder='ts-baseline' />
        </FormRow>
        <FormRow label='Dataset'>
          <TextField value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder='ts-2026-04-25' />
        </FormRow>
        <FormRow label='Target system'>
          <TextField value={system} onChange={(e) => setSystem(e.target.value)} placeholder='ts' />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>Launch</Button>
    </div>
  );
}
