import { useEffect } from 'react';

import {
  Alert,
  BlastRadiusBar,
  Checkbox,
  FormRow,
  MetricLabel,
  Panel,
  PanelTitle,
  Select,
  TextField,
} from '@lincyaw/aegis-ui';
import { ContainerType, PageSize } from '@lincyaw/portal';

import { errMsg } from '../../../../api/apiClient';
import { useContainersList, useContainerVersions } from '../../api/containers';
import {
  CHAOS_BY_NAME,
  type ChaosTypeDef,
  type ContainerChoice,
  type GuidedInjectionSpec,
  pedestalFor,
  pedestalProblem,
} from '../../domain/injectSpec';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

const BLAST_PERCENT: Record<ChaosTypeDef['blastHint'], number> = {
  pod: 25,
  service: 60,
  namespace: 90,
};

interface PickerProps {
  label: 'Pedestal' | 'Benchmark';
  description: string;
  type: ContainerType;
  choice: ContainerChoice;
  onChange: (choice: ContainerChoice) => void;
}

function useContainers(type: ContainerType) {
  return useContainersList({ page: 1, size: PageSize.XLarge, type });
}

function namesOf(list: ReturnType<typeof useContainers>): string[] {
  return (list.data?.items ?? [])
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n));
}

function ContainerPicker({
  label,
  description,
  type,
  choice,
  onChange,
}: PickerProps) {
  const list = useContainers(type);
  const chosen = list.data?.items.find((c) => c.name === choice.name);
  const versions = useContainerVersions(chosen?.id);
  const versionOptions = [
    { value: '', label: 'Latest' },
    ...(versions.data?.items ?? [])
      .map((v) => v.name)
      .filter((n): n is string => Boolean(n))
      .map((n) => ({ value: n, label: n })),
  ];
  const noun = label.toLowerCase();
  const id = `inject-${noun}`;

  return (
    <>
      <FormRow label={label} description={description} controlId={id}>
        {list.isError ? (
          <TextField
            id={id}
            aria-describedby={`${id}-description`}
            value={choice.name}
            onChange={(e) => onChange({ name: e.target.value, version: '' })}
            placeholder={`${noun} name`}
            error={`${label}s failed to load: ${errMsg(list.error)}. Enter the name.`}
          />
        ) : (
          <Select
            id={id}
            aria-describedby={`${id}-description`}
            value={choice.name}
            disabled={list.isLoading}
            placeholder={
              list.isLoading ? `Loading ${noun}s…` : `Select a ${noun}`
            }
            options={(list.data?.items ?? []).map((c) => ({
              value: c.name ?? '',
              label: c.name ?? '',
            }))}
            onChange={(name) => onChange({ name, version: '' })}
          />
        )}
      </FormRow>
      <FormRow
        label={`${label} version`}
        description={
          versions.isError
            ? `Versions failed to load: ${errMsg(versions.error)}. Latest is used.`
            : 'Latest unless you pick one.'
        }
        controlId={`${id}-version`}
      >
        <Select
          id={`${id}-version`}
          aria-describedby={`${id}-version-description`}
          value={choice.version}
          disabled={chosen === undefined || versions.isLoading}
          options={versionOptions}
          onChange={(version) => onChange({ ...choice, version })}
        />
      </FormRow>
    </>
  );
}

export function Step4Pedestal({ spec, update }: Props) {
  const def = CHAOS_BY_NAME[spec.chaosType];
  const expected = pedestalFor(spec.systemCode);
  const expectedListed = namesOf(
    useContainers(ContainerType.Pedestal)
  ).includes(expected);
  const benchmarks = namesOf(useContainers(ContainerType.Benchmark));
  const onlyBenchmark = benchmarks.length === 1 ? benchmarks[0] : undefined;
  const pedestalName = spec.pedestal.name;
  const benchmarkName = spec.benchmark.name;

  useEffect(() => {
    const patch: Partial<GuidedInjectionSpec> = {};
    if (pedestalName === '' && expectedListed) {
      patch.pedestal = { name: expected, version: '' };
    }
    if (benchmarkName === '' && onlyBenchmark !== undefined) {
      patch.benchmark = { name: onlyBenchmark, version: '' };
    }
    if (Object.keys(patch).length > 0) {
      update(patch);
    }
  }, [
    expected,
    expectedListed,
    onlyBenchmark,
    pedestalName,
    benchmarkName,
    update,
  ]);

  const mismatch = pedestalName === '' ? undefined : pedestalProblem(spec);

  return (
    <Panel
      title={<PanelTitle size='base'>4. Pedestal &amp; benchmark</PanelTitle>}
    >
      <ContainerPicker
        label='Pedestal'
        description={`The deployment of the system under test. ${spec.systemCode} runs on ${expected}.`}
        type={ContainerType.Pedestal}
        choice={spec.pedestal}
        onChange={(pedestal) => update({ pedestal })}
      />
      {mismatch !== undefined && <Alert tone='warning'>{mismatch}</Alert>}
      <ContainerPicker
        label='Benchmark'
        description='The workload that drives traffic while the fault runs.'
        type={ContainerType.Benchmark}
        choice={spec.benchmark}
        onChange={(benchmark) => update({ benchmark })}
      />

      <FormRow
        label='Pedestal restart'
        description='Maps to --skip-restart-pedestal.'
      >
        <Checkbox
          label='Skip restarting the pedestal'
          checked={spec.skipRestartPedestal}
          onChange={(checked) => update({ skipRestartPedestal: checked })}
        />
      </FormRow>

      <FormRow
        label='Blast radius'
        description='Every fault runs for the fixed fault window the server sets.'
        controlId='inject-blast-radius'
        labelBy='aria-labelledby'
      >
        <div className='page-stack'>
          <BlastRadiusBar
            value={def ? BLAST_PERCENT[def.blastHint] : 0}
            aria-labelledby='inject-blast-radius-label'
            aria-describedby='inject-blast-radius-description'
          />
          <MetricLabel size='xs'>
            {def
              ? `A ${def.name} fault reaches the ${def.blastHint} · pod < service < namespace`
              : 'Pick a chaos type to estimate the reach.'}
          </MetricLabel>
        </div>
      </FormRow>
    </Panel>
  );
}
