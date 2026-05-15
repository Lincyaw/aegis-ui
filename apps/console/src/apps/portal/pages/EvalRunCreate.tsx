import { App as AntdApp, Select } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

const MODELS = ['claude-opus-4-7', 'gpt-5-4', 'claude-sonnet-4-6'];

export default function EvalRunCreate() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const datasets = useMockStore((s) => s.datasets);
  const createEvalRun = useMockStore((s) => s.createEvalRun);

  const [model, setModel] = useState<string>(MODELS[0] ?? 'claude-opus-4-7');
  const [datasetId, setDatasetId] = useState(
    params.get('dataset') ?? datasets[0]?.id ?? '',
  );
  const [nCases, setNCases] = useState(8);

  const submit = (): void => {
    if (!datasetId) {
      void msg.error('select a dataset');
      return;
    }
    const created = createEvalRun({ model, datasetId, nCases });
    void msg.success(`Eval ${created.id} started`);
    navigate(`eval/${created.id}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New evaluation run'
        description='Launch an RCA agent eval.'
        action={
          <Button tone='secondary' onClick={() => navigate('eval')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Model'>
          <Select
            style={{ width: '100%' }}
            value={model}
            onChange={setModel}
            options={MODELS.map((m) => ({ value: m, label: m }))}
          />
        </FormRow>
        <FormRow label='Dataset'>
          <Select
            style={{ width: '100%' }}
            value={datasetId}
            onChange={setDatasetId}
            options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          />
        </FormRow>
        <FormRow label={`N cases · ${nCases}`}>
          <input
            type='range'
            min={4}
            max={64}
            value={nCases}
            onChange={(e) => setNCases(Number(e.target.value))}
            className='wizard-range'
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Start
      </Button>
    </div>
  );
}
