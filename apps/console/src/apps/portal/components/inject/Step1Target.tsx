import {
  ChoiceCardGroup,
  FormRow,
  Panel,
  PanelTitle,
  SectionDivider,
  Select,
  TextField,
} from '@lincyaw/aegis-ui';

import { errMsg } from '../../../../api/apiClient';
import { useInjectCandidates, useSystems } from '../../api/systems';
import type {
  GuidedInjectionSpec,
  NamespaceMode,
} from '../../domain/injectSpec';
import { useInjectBatch } from '../../state/inject-batch';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

const NAMESPACE_MODES: Array<{
  value: NamespaceMode;
  title: string;
  description: string;
  meta: string;
}> = [
  {
    value: 'auto',
    title: 'Auto-allocate',
    description: 'Take a free namespace from the pool.',
    meta: '--auto',
  },
  {
    value: 'auto-bootstrap',
    title: 'Auto + bootstrap',
    description: 'Take one from the pool, or set up a new one.',
    meta: '--allow-bootstrap',
  },
  {
    value: 'specific',
    title: 'Specific namespace',
    description: 'Inject into a namespace you name.',
    meta: '--namespace',
  },
];

const NO_CONTAINER = { name: '', version: '' };

export function Step1Target({ spec, update }: Props) {
  const templates = useInjectBatch((s) => s.templates);
  const systemsQuery = useSystems();
  const candidatesQuery = useInjectCandidates(
    spec.systemCode,
    spec.namespaceMode === 'specific' ? spec.namespace : undefined
  );

  const systemOptions = (systemsQuery.data?.items ?? []).map((sys) => ({
    value: sys.name ?? '',
    label:
      sys.display_name && sys.name
        ? `${sys.display_name} (${sys.name})`
        : (sys.display_name ?? sys.name ?? ''),
  }));
  const appOptions = [
    ...new Set(
      (candidatesQuery.data?.items ?? [])
        .map((c) => c.app)
        .filter((a): a is string => Boolean(a))
    ),
  ].map((a) => ({ value: a, label: a }));

  const candidatesReady =
    spec.systemCode.length > 0 &&
    (spec.namespaceMode !== 'specific' || spec.namespace.length > 0);

  const appHelp = !candidatesReady
    ? spec.namespaceMode === 'specific'
      ? 'Pick a system and a namespace to list its apps.'
      : 'Pick a system to list its apps.'
    : spec.namespaceMode === 'specific'
      ? 'Apps found in this namespace.'
      : 'Apps found for this system across its namespaces.';

  const setSystem = (systemCode: string): void => {
    update({ systemCode, app: '', pedestal: NO_CONTAINER });
  };

  return (
    <Panel title={<PanelTitle size='base'>1. Target</PanelTitle>}>
      {templates.length > 0 && (
        <FormRow label='Template'>
          <Select
            ariaLabel='Load from template'
            value=''
            placeholder='Load a saved template'
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(templateId) => {
              const template = templates.find((t) => t.id === templateId);
              if (template) {
                update(template.spec);
              }
            }}
          />
        </FormRow>
      )}

      <FormRow
        label='Namespace'
        description='Where the fault runs, as aegisctl inject guided chooses it.'
      >
        <ChoiceCardGroup
          ariaLabel='Namespace allocation'
          value={spec.namespaceMode}
          onChange={(value) => {
            const mode = NAMESPACE_MODES.find((m) => m.value === value);
            if (mode) {
              update({ namespaceMode: mode.value });
            }
          }}
          options={NAMESPACE_MODES}
        />
      </FormRow>

      {spec.namespaceMode === 'specific' && (
        <FormRow label='Namespace name'>
          <TextField
            aria-label='Namespace name'
            value={spec.namespace}
            onChange={(e) => update({ namespace: e.target.value })}
            placeholder='e.g. ts-1'
          />
        </FormRow>
      )}

      <FormRow label='System' description='From the chaos systems registry.'>
        {systemsQuery.isError ? (
          <TextField
            aria-label='System'
            value={spec.systemCode}
            onChange={(e) => setSystem(e.target.value)}
            placeholder='system short code'
            error={`Systems failed to load: ${errMsg(systemsQuery.error)}. Enter the short code.`}
          />
        ) : (
          <Select
            ariaLabel='System'
            value={spec.systemCode}
            disabled={systemsQuery.isLoading}
            placeholder={
              systemsQuery.isLoading ? 'Loading systems…' : 'Select a system'
            }
            options={systemOptions}
            onChange={setSystem}
          />
        )}
      </FormRow>

      <FormRow
        label='System type'
        description='Optional chaos.system_type tag.'
      >
        <TextField
          aria-label='System type'
          value={spec.systemType}
          onChange={(e) => update({ systemType: e.target.value })}
          placeholder='e.g. ts'
        />
      </FormRow>

      <SectionDivider>App</SectionDivider>

      <FormRow label='App' description={appHelp}>
        {candidatesQuery.isError || !candidatesReady ? (
          <TextField
            aria-label='App'
            value={spec.app}
            onChange={(e) => update({ app: e.target.value })}
            placeholder='deployment label'
            error={
              candidatesQuery.isError
                ? `Apps failed to load: ${errMsg(candidatesQuery.error)}. Enter the app.`
                : undefined
            }
          />
        ) : (
          <Select
            ariaLabel='App'
            value={spec.app}
            disabled={candidatesQuery.isLoading}
            placeholder={
              candidatesQuery.isLoading ? 'Loading apps…' : 'Select an app'
            }
            options={appOptions}
            onChange={(value) => update({ app: value })}
          />
        )}
      </FormRow>

      <FormRow
        label='Container'
        description='Optional. Container, memory, CPU and time faults act on it.'
      >
        <TextField
          aria-label='Container'
          value={spec.container}
          onChange={(e) => update({ container: e.target.value })}
          placeholder='e.g. main'
        />
      </FormRow>

      <FormRow
        label='Target service'
        description='Optional. Network faults act on traffic to it.'
      >
        <TextField
          aria-label='Target service'
          value={spec.targetService}
          onChange={(e) => update({ targetService: e.target.value })}
          placeholder='e.g. checkoutservice'
        />
      </FormRow>
    </Panel>
  );
}
