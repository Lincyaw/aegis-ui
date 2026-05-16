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

// TODO(portal-wire): no RegressionsApi in @lincyaw/portal 1.3.0/1.4.0 — regression cases/runs have no backend surface yet; stays on mocks.
import { useMockStore } from '../mocks';

export default function RegressionRun() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const cases = useMockStore((s) => s.regressionCases);
  const systems = useMockStore((s) => s.systems.filter((sys) => sys.enabled));
  const datasets = useMockStore((s) => s.datasets);
  const runRegression = useMockStore((s) => s.runRegression);

  const [caseId, setCaseId] = useState(params.get('case') ?? cases[0]?.id ?? '');
  const [systemCode, setSystemCode] = useState(systems[0]?.code ?? '');
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [concurrency, setConcurrency] = useState(4);

  const submit = (): void => {
    if (!caseId || !systemCode || !datasetId) {
      void msg.error('all fields required');
      return;
    }
    const created = runRegression({ caseId, systemCode, datasetId, concurrency });
    const caseName = cases.find((c) => c.id === caseId)?.name ?? caseId;
    void msg.success(`Regression run ${created.id} queued`);
    navigate(`regression/${caseName}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Run regression case'
        description='Launch a pinned case against a target system.'
        action={
          <Button tone='secondary' onClick={() => navigate('regression')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Case'>
          <Select
            style={{ width: '100%' }}
            value={caseId}
            onChange={setCaseId}
            options={cases.map((c) => ({ value: c.id, label: c.name }))}
          />
        </FormRow>
        <FormRow label='Target system'>
          <Select
            style={{ width: '100%' }}
            value={systemCode}
            onChange={setSystemCode}
            options={systems.map((s) => ({ value: s.code, label: s.code }))}
          />
        </FormRow>
        <FormRow label='Baseline dataset'>
          <Select
            style={{ width: '100%' }}
            value={datasetId}
            onChange={setDatasetId}
            options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          />
        </FormRow>
        <FormRow label={`Concurrency · ${concurrency}`}>
          <input
            type='range'
            min={1}
            max={16}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className='wizard-range'
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Launch
      </Button>
    </div>
  );
}
