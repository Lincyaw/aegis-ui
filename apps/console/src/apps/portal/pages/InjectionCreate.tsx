import { App as AntdApp } from 'antd';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  BlastRadiusBar,
  Button,
  Chip,
  KeyValueList,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { WizardSteps } from '../components/WizardSteps';
import { useMockStore } from '../mocks';

const STEPS = ['Target', 'Fault', 'Blast Radius', 'Review'];

export default function InjectionCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const systems = useMockStore((s) => s.systems);
  const contracts = useMockStore((s) => s.contracts);
  const pedestals = useMockStore((s) => s.pedestals);
  const createInjection = useMockStore((s) => s.createInjection);

  const [step, setStep] = useState(0);
  const [systemCode, setSystemCode] = useState(params.get('system') ?? '');
  const [contractId, setContractId] = useState(params.get('contract') ?? '');
  const [blastRadius, setBlastRadius] = useState<'pod' | 'service' | 'namespace'>('service');
  const [durationSec, setDurationSec] = useState(60);
  const [intensity, setIntensity] = useState(50);

  const selectedSystem = systems.find((s) => s.code === systemCode);
  const selectedContract = contracts.find((c) => c.id === contractId);
  const targetPedestals = useMemo(
    () => pedestals.filter((p) => p.systemCode === systemCode),
    [pedestals, systemCode],
  );

  const familyGroups = useMemo(() => {
    const map = new Map<string, typeof contracts>();
    for (const c of contracts) {
      const arr = map.get(c.family) ?? [];
      arr.push(c);
      map.set(c.family, arr);
    }
    return Array.from(map.entries());
  }, [contracts]);

  const canNext =
    (step === 0 && !!systemCode) ||
    (step === 1 && !!contractId) ||
    (step === 2 && durationSec > 0) ||
    step === 3;

  const submit = (): void => {
    if (!systemCode || !contractId) {
      void msg.error('select a target system and a contract');
      return;
    }
    const created = createInjection({
      projectId: projectId ?? 'proj-catalog',
      systemCode,
      contractId,
      blastRadius,
      durationSec,
      intensity,
    });
    void msg.success(`Injection ${created.id} queued`);
    navigate(`projects/${projectId ?? 'proj-catalog'}/injections/${created.id}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Injection'
        description={`Submit a fault injection for project ${projectId ?? ''}.`}
        action={
          <Button
            tone='secondary'
            onClick={() => {
              navigate(`projects/${projectId ?? 'proj-catalog'}/injections`);
            }}
          >
            Cancel
          </Button>
        }
      />

      <WizardSteps steps={STEPS} activeIndex={step} />

      {step === 0 && (
        <Panel title={<PanelTitle size='base'>1. Select target system</PanelTitle>}>
          <div className='page-overview-grid'>
            {systems.map((s) => (
              <button
                key={s.code}
                type='button'
                className='wizard-card'
                data-active={s.code === systemCode}
                onClick={() => setSystemCode(s.code)}
                disabled={!s.enabled}
              >
                <div className='wizard-card__head'>
                  <MonoValue size='sm'>{s.code}</MonoValue>
                  <Chip tone={s.enabled ? 'ink' : 'ghost'}>
                    {s.enabled ? 'enabled' : 'disabled'}
                  </Chip>
                </div>
                <div className='wizard-card__name'>{s.name}</div>
                <MetricLabel size='xs'>{s.pedestalCount} pedestals</MetricLabel>
              </button>
            ))}
          </div>
          {selectedSystem && (
            <>
              <SectionDivider>Available pedestals</SectionDivider>
              {targetPedestals.length === 0 ? (
                <MetricLabel>no pedestals deployed for {selectedSystem.code}</MetricLabel>
              ) : (
                <KeyValueList
                  items={targetPedestals.map((p) => ({
                    k: p.namespace,
                    v: (
                      <span>
                        <MonoValue size='sm'>{p.version}</MonoValue> · {p.status}
                      </span>
                    ),
                  }))}
                />
              )}
            </>
          )}
        </Panel>
      )}

      {step === 1 && (
        <Panel title={<PanelTitle size='base'>2. Select fault contract</PanelTitle>}>
          {familyGroups.map(([family, items]) => (
            <div key={family} className='wizard-family'>
              <SectionDivider>{family}</SectionDivider>
              <div className='wizard-contract-grid'>
                {items.map((c) => (
                  <button
                    key={c.id}
                    type='button'
                    className='wizard-card'
                    data-active={c.id === contractId}
                    onClick={() => setContractId(c.id)}
                  >
                    <div className='wizard-card__head'>
                      <MonoValue size='sm'>{c.name}</MonoValue>
                      <Chip tone='ghost'>{c.faultType}</Chip>
                    </div>
                    <div className='wizard-card__desc'>{c.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {step === 2 && (
        <Panel title={<PanelTitle size='base'>3. Blast radius &amp; duration</PanelTitle>}>
          <div className='wizard-form-grid'>
            <div>
              <MetricLabel>Scope</MetricLabel>
              <div className='wizard-radio-row'>
                {(['pod', 'service', 'namespace'] as const).map((b) => (
                  <button
                    key={b}
                    type='button'
                    className='wizard-card wizard-card--inline'
                    data-active={blastRadius === b}
                    onClick={() => setBlastRadius(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <MetricLabel>Duration · {durationSec}s</MetricLabel>
              <input
                type='range'
                min={15}
                max={600}
                step={15}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className='wizard-range'
              />
            </div>
            <div>
              <MetricLabel>Intensity · {intensity}%</MetricLabel>
              <input
                type='range'
                min={10}
                max={100}
                step={10}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className='wizard-range'
              />
            </div>
            <div>
              <MetricLabel>Estimated blast</MetricLabel>
              <BlastRadiusBar
                value={blastRadius === 'pod' ? 25 : blastRadius === 'service' ? 55 : 90}
              />
            </div>
          </div>
        </Panel>
      )}

      {step === 3 && (
        <Panel title={<PanelTitle size='base'>4. Review &amp; confirm</PanelTitle>}>
          <KeyValueList
            items={[
              { k: 'project', v: <MonoValue size='sm'>{projectId ?? ''}</MonoValue> },
              { k: 'system', v: <MonoValue size='sm'>{systemCode}</MonoValue> },
              {
                k: 'contract',
                v: <MonoValue size='sm'>{selectedContract?.name ?? ''}</MonoValue>,
              },
              { k: 'blast radius', v: blastRadius },
              { k: 'duration', v: `${durationSec}s` },
              { k: 'intensity', v: `${intensity}%` },
            ]}
          />
        </Panel>
      )}

      <div className='wizard-actions'>
        <Button
          tone='ghost'
          onClick={() => {
            setStep((s) => Math.max(0, s - 1));
          }}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            tone='primary'
            onClick={() => {
              setStep((s) => s + 1);
            }}
            disabled={!canNext}
          >
            Next
          </Button>
        ) : (
          <Button tone='primary' onClick={submit}>
            Inject now
          </Button>
        )}
      </div>
    </div>
  );
}
