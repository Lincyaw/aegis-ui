import { App as AntdApp } from 'antd';
import { useState } from 'react';

import {
  Button,
  Chip,
  FormRow,
  KeyValueList,
  PageHeader,
  Panel,
  PanelTitle,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { WizardSteps } from '../components/WizardSteps';
import { useMockStore } from '../mocks';

const STEPS = ['Identity', 'Helm chart', 'Prereqs', 'Confirm'];

const DEFAULT_PREREQS = [
  'helm chart published',
  'otel collector reachable',
  'db seed applied',
];

export default function SystemRegister() {
  const navigate = useAppNavigate();
  const registerSystem = useMockStore((s) => s.registerSystem);
  const { message: msg } = AntdApp.useApp();

  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chart, setChart] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [otel, setOtel] = useState('http://otel-collector:4317');
  const [prereqs, setPrereqs] = useState<Record<string, boolean>>({
    'helm chart published': true,
    'otel collector reachable': true,
    'db seed applied': false,
  });

  const canNext =
    (step === 0 && !!code && !!name) ||
    (step === 1 && !!chart && !!version) ||
    step === 2 ||
    step === 3;

  const submit = (): void => {
    const created = registerSystem({
      code,
      name,
      description,
      chart,
      version,
      otelEndpoint: otel,
      enabled: true,
      systemType: code,
      apps: [],
      prereqs: DEFAULT_PREREQS.map((p) => ({
        name: p,
        ok: prereqs[p] ?? false,
      })),
    });
    void msg.success(`Registered system ${created.code}`);
    navigate(`systems/${created.code}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Register system'
        description='Add a new benchmark to the aegis control plane.'
        action={
          <Button tone='secondary' onClick={() => navigate('systems')}>
            Cancel
          </Button>
        }
      />

      <WizardSteps steps={STEPS} activeIndex={step} />

      {step === 0 && (
        <Panel title={<PanelTitle size='base'>1. Identity</PanelTitle>}>
          <FormRow label='Short code'>
            <TextField
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='ts'
            />
          </FormRow>
          <FormRow label='Name'>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Train-Ticket'
            />
          </FormRow>
          <FormRow label='Description'>
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Java microservice — 41 services.'
            />
          </FormRow>
        </Panel>
      )}

      {step === 1 && (
        <Panel title={<PanelTitle size='base'>2. Helm chart</PanelTitle>}>
          <FormRow label='Chart reference'>
            <TextField
              value={chart}
              onChange={(e) => setChart(e.target.value)}
              placeholder='oci://opspai/benchmarks/ts'
            />
          </FormRow>
          <FormRow label='Version'>
            <TextField value={version} onChange={(e) => setVersion(e.target.value)} />
          </FormRow>
          <FormRow label='OTel sink URL'>
            <TextField value={otel} onChange={(e) => setOtel(e.target.value)} />
          </FormRow>
        </Panel>
      )}

      {step === 2 && (
        <Panel title={<PanelTitle size='base'>3. Prereqs</PanelTitle>}>
          {DEFAULT_PREREQS.map((p) => (
            <FormRow key={p} label={p}>
              <label>
                <input
                  type='checkbox'
                  checked={prereqs[p] ?? false}
                  onChange={(e) =>
                    setPrereqs((s) => ({ ...s, [p]: e.target.checked }))
                  }
                />{' '}
                checked
              </label>
            </FormRow>
          ))}
        </Panel>
      )}

      {step === 3 && (
        <Panel title={<PanelTitle size='base'>4. Confirm</PanelTitle>}>
          <KeyValueList
            items={[
              { k: 'short code', v: code },
              { k: 'name', v: name },
              { k: 'chart', v: chart },
              { k: 'version', v: version },
              { k: 'otel', v: otel },
              {
                k: 'prereqs',
                v: (
                  <div className='page-action-row'>
                    {DEFAULT_PREREQS.map((p) => (
                      <Chip key={p} tone={prereqs[p] ? 'ink' : 'warning'}>
                        {p}
                      </Chip>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      )}

      <div className='wizard-actions'>
        <Button
          tone='ghost'
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            tone='primary'
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button tone='primary' onClick={submit}>
            Register
          </Button>
        )}
      </div>
    </div>
  );
}
