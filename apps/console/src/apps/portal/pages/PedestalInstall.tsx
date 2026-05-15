import { useState } from 'react';

import { Button, FormRow, PageHeader, Panel, TextField } from '@lincyaw/aegis-ui';

export default function PedestalInstall() {
  const [system, setSystem] = useState('');
  const [version, setVersion] = useState('');
  const [ns, setNs] = useState('');
  const [overrides, setOverrides] = useState(false);

  const submit = (): void => {
    // eslint-disable-next-line no-console
    console.log('install pedestal', { system, version, ns, overrides });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader title='Install pedestal' description='Provision a new benchmark instance.' />
      <Panel>
        <FormRow label='System short code'>
          <TextField value={system} onChange={(e) => setSystem(e.target.value)} placeholder='ts' />
        </FormRow>
        <FormRow label='Version'>
          <TextField value={version} onChange={(e) => setVersion(e.target.value)} placeholder='v1.4.2' />
        </FormRow>
        <FormRow label='Namespace'>
          <TextField value={ns} onChange={(e) => setNs(e.target.value)} placeholder='ts-3' />
        </FormRow>
        <FormRow label='Apply DB overrides' description='Merge helm_config_values rows (matches RestartPedestal).'>
          <label>
            <input type='checkbox' checked={overrides} onChange={(e) => setOverrides(e.target.checked)} /> Apply overrides
          </label>
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>Install</Button>
    </div>
  );
}
