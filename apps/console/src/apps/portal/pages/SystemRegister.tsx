import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  PanelTitle,
  TextField,
} from '@lincyaw/aegis-ui';

export default function SystemRegister() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [chart, setChart] = useState('');
  const [otel, setOtel] = useState('');
  const [prereqs, setPrereqs] = useState('');

  const submit = (): void => {
    // eslint-disable-next-line no-console
    console.log('register system', { code, name, chart, otel, prereqs });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader title='Register system' description='Add a new benchmark to the aegis control plane.' />
      <Panel title={<PanelTitle size='base'>Basics</PanelTitle>}>
        <FormRow label='Short code' description='Lowercase identifier used everywhere (e.g. ts, hs, sn).'>
          <TextField value={code} onChange={(e) => setCode(e.target.value)} placeholder='ts' />
        </FormRow>
        <FormRow label='Full name'>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder='Train-Ticket' />
        </FormRow>
        <FormRow label='Helm chart reference'>
          <TextField value={chart} onChange={(e) => setChart(e.target.value)} placeholder='oci://opspai/benchmarks/ts' />
        </FormRow>
        <FormRow label='OTel endpoint'>
          <TextField value={otel} onChange={(e) => setOtel(e.target.value)} placeholder='http://otel-collector:4317' />
        </FormRow>
        <FormRow label='Prereqs' description='Comma-separated list of prereq names.'>
          <TextField value={prereqs} onChange={(e) => setPrereqs(e.target.value)} placeholder='mysql, redis' />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Register
      </Button>
    </div>
  );
}
