import { App as AntdApp, Select } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  CodeEditor,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

const DEFAULT_VALUES =
  'image:\n  repository: pair-cn-shanghai.cr.volces.com/opspai/<system>\n  tag: v1.0.0\notel:\n  endpoint: http://otel-collector:4317\n';

export default function PedestalInstall() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const systems = useMockStore((s) => s.systems);
  const installPedestal = useMockStore((s) => s.installPedestal);

  const [systemCode, setSystemCode] = useState(params.get('system') ?? '');
  const [version, setVersion] = useState('v1.0.0');
  const [namespace, setNamespace] = useState('');
  const [helmValues, setHelmValues] = useState(DEFAULT_VALUES);

  const submit = (): void => {
    if (!systemCode || !namespace) {
      void msg.error('system + namespace are required');
      return;
    }
    const created = installPedestal({ systemCode, version, namespace, helmValues });
    void msg.success(`Pedestal ${created.id} installing`);
    navigate(`pedestals/${created.id}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Install pedestal'
        description='Provision a new benchmark instance.'
        action={
          <Button tone='secondary' onClick={() => navigate('pedestals')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='System'>
          <Select
            style={{ width: '100%' }}
            value={systemCode || undefined}
            onChange={setSystemCode}
            placeholder='select system'
            options={systems.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }))}
          />
        </FormRow>
        <FormRow label='Version'>
          <TextField value={version} onChange={(e) => setVersion(e.target.value)} />
        </FormRow>
        <FormRow label='Namespace'>
          <TextField
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder='ts-3'
          />
        </FormRow>
        <FormRow label='Helm values'>
          <CodeEditor
            value={helmValues}
            onChange={setHelmValues}
            language='yaml'
            height={240}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Install
      </Button>
    </div>
  );
}
