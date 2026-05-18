import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeEditor,
  EmptyState,
  FormRow,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import {
  type ContainerContainerResp,
  type ContainerContainerVersionResp,
  ContainerType,
  type PedestalInstallPedestalReq,
} from '@lincyaw/portal';
import { useQuery } from '@tanstack/react-query';
import { App as AntdApp, Select, Spin } from 'antd';
import yaml from 'js-yaml';

import { useInstallPedestal, usePedestalHelmConfig } from '../api/pedestals';
import { containersApi } from '../api/portal-client';
import { useSystems } from '../api/systems';
import { WizardSteps } from '../components/WizardSteps';

const STEPS = ['System', 'Container version', 'Helm values', 'Review'];

function useChaosPedestalContainers() {
  return useQuery<ContainerContainerResp[]>({
    queryKey: ['containers', 'list', { type: ContainerType.Pedestal }],
    queryFn: async () => {
      const res = await containersApi.listContainers({
        type: ContainerType.Pedestal,
      });
      return res.data.data?.items ?? [];
    },
  });
}

function useContainerVersions(containerId: number | undefined) {
  return useQuery<ContainerContainerVersionResp[]>({
    queryKey: ['containers', 'versions', containerId],
    enabled: containerId !== undefined && Number.isFinite(containerId),
    queryFn: async () => {
      if (containerId === undefined) {
        return [];
      }
      const res = await containersApi.listContainerVersions({ containerId });
      return res.data.data?.items ?? [];
    },
  });
}

type HelmParseResult =
  | { ok: true; value: Record<string, unknown> | undefined }
  | { ok: false; error: string };

function parseHelmYaml(text: string): HelmParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: undefined };
  }
  let parsed: unknown;
  try {
    parsed = yaml.load(trimmed);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid YAML',
    };
  }
  if (parsed == null) {
    return { ok: true, value: undefined };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Helm values must be a YAML mapping' };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}

export default function PedestalInstall() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const [step, setStep] = useState(0);
  const [systemCode, setSystemCode] = useState(params.get('system') ?? '');
  const [containerId, setContainerId] = useState<number | undefined>();
  const [versionId, setVersionId] = useState<number | undefined>();
  const [namespace, setNamespace] = useState('');
  const [helmValues, setHelmValues] = useState('');
  const [helmTouched, setHelmTouched] = useState(false);

  const systemsQuery = useSystems();
  const containersQuery = useChaosPedestalContainers();
  const versionsQuery = useContainerVersions(containerId);
  const helmConfigQuery = usePedestalHelmConfig(versionId);
  const installMutation = useInstallPedestal();

  const versions = useMemo(
    () => versionsQuery.data ?? [],
    [versionsQuery.data]
  );

  useEffect(() => {
    if (versionId === undefined && versions.length > 0) {
      setVersionId(versions[0]?.id);
    }
  }, [versions, versionId]);

  useEffect(() => {
    if (helmTouched) {
      return;
    }
    const cfg = helmConfigQuery.data;
    if (cfg && Object.keys(cfg).length > 0) {
      setHelmValues(yaml.dump(cfg));
    }
  }, [helmConfigQuery.data, helmTouched]);

  const helmParse = useMemo(() => parseHelmYaml(helmValues), [helmValues]);

  const onNext = (): void => {
    if (step === 0 && !systemCode) {
      void msg.error('Pick a system to continue');
      return;
    }
    if (step === 1 && (containerId === undefined || versionId === undefined)) {
      void msg.error('Pick a container version to continue');
      return;
    }
    if (step === 2 && !helmParse.ok) {
      void msg.error(`Helm values: ${helmParse.error}`);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onBack = (): void => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (): Promise<void> => {
    if (versionId === undefined) {
      void msg.error('Container version is required');
      return;
    }
    const body: PedestalInstallPedestalReq = {
      system_code: systemCode,
      container_version_id: versionId,
    };
    if (namespace.trim().length > 0) {
      body.namespace = namespace.trim();
    }
    if (!helmParse.ok) {
      void msg.error(`Helm values: ${helmParse.error}`);
      return;
    }
    if (helmParse.value) {
      body.helm_values = helmParse.value;
    }
    try {
      const result = await installMutation.mutateAsync(body);
      void msg.success(`Pedestal ${result.release ?? systemCode} installed`);
      navigate(`pedestals/${result.release ?? systemCode}`);
    } catch {
      void msg.error('Install failed');
    }
  };

  const systems = systemsQuery.data ?? [];
  const containers = containersQuery.data ?? [];
  const selectedContainer = containers.find((c) => c.id === containerId);
  const selectedVersion = versions.find((v) => v.id === versionId);
  const selectedSystem = systems.find((s) => s.name === systemCode);

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
      <WizardSteps steps={STEPS} activeIndex={step} />

      {step === 0 && (
        <Panel>
          <FormRow label='System'>
            {systemsQuery.isLoading ? (
              <Spin />
            ) : (
              <Select
                style={{ width: '100%' }}
                value={systemCode || undefined}
                onChange={setSystemCode}
                placeholder='select system'
                options={systems.map((s) => ({
                  value: s.name ?? '',
                  label: `${s.name ?? ''}${s.display_name ? ` — ${s.display_name}` : ''}`,
                }))}
              />
            )}
          </FormRow>
        </Panel>
      )}

      {step === 1 && (
        <Panel>
          <FormRow label='Pedestal container'>
            {containersQuery.isLoading ? (
              <Spin />
            ) : containers.length === 0 ? (
              <EmptyState
                title='No pedestal containers'
                description='Register a Pedestal-type container first.'
              />
            ) : (
              <Select
                style={{ width: '100%' }}
                value={containerId}
                onChange={(value) => {
                  setContainerId(value);
                  setVersionId(undefined);
                  setHelmTouched(false);
                }}
                placeholder='select container'
                options={containers.map((c) => ({
                  value: c.id ?? 0,
                  label: c.name ?? `container ${c.id ?? '?'}`,
                }))}
              />
            )}
          </FormRow>
          <FormRow label='Version'>
            {containerId === undefined ? (
              '—'
            ) : versionsQuery.isLoading ? (
              <Spin />
            ) : (
              <Select
                style={{ width: '100%' }}
                value={versionId}
                onChange={(value) => {
                  setVersionId(value);
                  setHelmTouched(false);
                }}
                placeholder='select version'
                options={versions.map((v) => ({
                  value: v.id ?? 0,
                  label: `${v.name ?? `v${v.id ?? '?'}`}${v.image_ref ? ` — ${v.image_ref}` : ''}`,
                }))}
              />
            )}
          </FormRow>
        </Panel>
      )}

      {step === 2 && (
        <Panel>
          <FormRow label='Namespace (optional)'>
            <TextField
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder={systemCode}
            />
          </FormRow>
          <FormRow label='Helm values override (optional)'>
            {helmConfigQuery.isLoading ? (
              <Spin />
            ) : (
              <>
                <CodeEditor
                  value={helmValues}
                  onChange={(value) => {
                    setHelmTouched(true);
                    setHelmValues(value);
                  }}
                  language='yaml'
                  height={240}
                />
                {!helmParse.ok && (
                  <Chip tone='warning'>YAML error: {helmParse.error}</Chip>
                )}
              </>
            )}
          </FormRow>
        </Panel>
      )}

      {step === 3 && (
        <Panel>
          <KeyValueList
            items={[
              {
                k: 'system_code',
                v: <MonoValue size='sm'>{systemCode}</MonoValue>,
              },
              {
                k: 'system',
                v: selectedSystem?.display_name ?? selectedSystem?.name ?? '—',
              },
              { k: 'container', v: selectedContainer?.name ?? '—' },
              {
                k: 'container_version_id',
                v: (
                  <MonoValue size='sm'>
                    {selectedVersion?.id ?? versionId ?? '—'}
                  </MonoValue>
                ),
              },
              {
                k: 'version',
                v: selectedVersion?.name ?? '—',
              },
              {
                k: 'namespace',
                v: (
                  <MonoValue size='sm'>
                    {namespace.trim().length > 0
                      ? namespace.trim()
                      : '(default)'}
                  </MonoValue>
                ),
              },
              {
                k: 'helm_values',
                v: helmValues.trim().length > 0 ? 'overridden' : '(defaults)',
              },
            ]}
          />
        </Panel>
      )}

      <div className='page-action-row'>
        {step > 0 && (
          <Button tone='secondary' onClick={onBack}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button tone='primary' onClick={onNext}>
            Next
          </Button>
        )}
        {step === STEPS.length - 1 && (
          <Button
            tone='primary'
            onClick={() => {
              void onSubmit();
            }}
            disabled={installMutation.isPending || !helmParse.ok}
          >
            {installMutation.isPending ? 'Installing…' : 'Install'}
          </Button>
        )}
      </div>

      {installMutation.isPending && (
        <Panel>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Spin />
            <span>
              Installing release — backend may take up to 10 minutes to
              reconcile.
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}
