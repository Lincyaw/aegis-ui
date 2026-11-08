import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Alert,
  Button,
  Chip,
  CodeEditor,
  EmptyState,
  FormRow,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  Select,
  SkeletonText,
  Steps,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import {
  ContainerType,
  type PedestalInstallPedestalReq,
} from '@lincyaw/portal';
import { App as AntdApp } from 'antd';
import yaml from 'js-yaml';

import { errMsg } from '../../../api/apiClient';
import { useContainersList, useContainerVersions } from '../api/containers';
import { useInstallPedestal, usePedestalHelmConfig } from '../api/pedestals';
import { useSystems } from '../api/systems';

const STEPS = ['System', 'Container version', 'Helm values', 'Review'];

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
      error: errMsg(err, 'Invalid YAML'),
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
  const containersQuery = useContainersList({ type: ContainerType.Pedestal });
  const versionsQuery = useContainerVersions(containerId);
  const helmConfigQuery = usePedestalHelmConfig(versionId);
  const installMutation = useInstallPedestal();

  const versions = useMemo(
    () => versionsQuery.data?.items ?? [],
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

  const stepReady =
    step === 0
      ? systemCode !== ''
      : step === 1
        ? containerId !== undefined && versionId !== undefined
        : step === 2
          ? helmParse.ok
          : true;

  const onSubmit = (): void => {
    if (versionId === undefined || !helmParse.ok) {
      return;
    }
    const body: PedestalInstallPedestalReq = {
      system_code: systemCode,
      container_version_id: versionId,
    };
    if (namespace.trim().length > 0) {
      body.namespace = namespace.trim();
    }
    if (helmParse.value) {
      body.helm_values = helmParse.value;
    }
    installMutation.mutate(body, {
      onSuccess: (result) => {
        void msg.success(`Pedestal ${result.release ?? systemCode} installed`);
        navigate(`pedestals/${result.release ?? systemCode}`);
      },
      onError: (err) => {
        void msg.error(`Install failed: ${errMsg(err)}`);
      },
    });
  };

  const systems = systemsQuery.data?.items ?? [];
  const containers = containersQuery.data?.items ?? [];
  const selectedContainer = containers.find((c) => c.id === containerId);
  const selectedVersion = versions.find((v) => v.id === versionId);
  const selectedSystem = systems.find((s) => s.name === systemCode);

  return (
    <>
      <PageHeader
        title='Install pedestal'
        description='Provision a new benchmark instance.'
        action={
          <Button tone='secondary' onClick={() => navigate('pedestals')}>
            Cancel
          </Button>
        }
      />
      <Steps
        ariaLabel='Install steps'
        current={step}
        items={STEPS.map((label) => ({ key: label, label }))}
      />

      {step === 0 && (
        <Panel>
          <FormRow
            label='System'
            controlId={
              systemsQuery.isLoading || systemsQuery.isError
                ? undefined
                : 'pedestal-install-system'
            }
          >
            {systemsQuery.isLoading ? (
              <SkeletonText lines={1} />
            ) : systemsQuery.isError ? (
              <Chip tone='warning'>
                {`Failed to load systems: ${errMsg(systemsQuery.error)}`}
              </Chip>
            ) : (
              <Select
                id='pedestal-install-system'
                value={systemCode}
                onChange={setSystemCode}
                placeholder='Select a system'
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
          <FormRow
            label='Pedestal container'
            controlId={
              containersQuery.isLoading ||
              containersQuery.isError ||
              containers.length === 0
                ? undefined
                : 'pedestal-install-container'
            }
          >
            {containersQuery.isLoading ? (
              <SkeletonText lines={1} />
            ) : containersQuery.isError ? (
              <Chip tone='warning'>
                {`Failed to load containers: ${errMsg(containersQuery.error)}`}
              </Chip>
            ) : containers.length === 0 ? (
              <EmptyState
                title='No pedestal containers'
                description='Register a Pedestal-type container first.'
              />
            ) : (
              <Select
                id='pedestal-install-container'
                value={containerId === undefined ? '' : String(containerId)}
                onChange={(value) => {
                  setContainerId(Number(value));
                  setVersionId(undefined);
                  setHelmTouched(false);
                }}
                placeholder='Select a container'
                options={containers.map((c) => ({
                  value: String(c.id ?? ''),
                  label: c.name ?? `container ${String(c.id ?? '?')}`,
                }))}
              />
            )}
          </FormRow>
          <FormRow
            label='Version'
            controlId={
              containerId === undefined ||
              versionsQuery.isLoading ||
              versionsQuery.isError
                ? undefined
                : 'pedestal-install-version'
            }
          >
            {containerId === undefined ? (
              '—'
            ) : versionsQuery.isLoading ? (
              <SkeletonText lines={1} />
            ) : versionsQuery.isError ? (
              <Chip tone='warning'>
                {`Failed to load versions: ${errMsg(versionsQuery.error)}`}
              </Chip>
            ) : (
              <Select
                id='pedestal-install-version'
                value={versionId === undefined ? '' : String(versionId)}
                onChange={(value) => {
                  setVersionId(Number(value));
                  setHelmTouched(false);
                }}
                placeholder='Select a version'
                options={versions.map((v) => ({
                  value: String(v.id ?? ''),
                  label: `${v.name ?? `v${String(v.id ?? '?')}`}${v.image_ref ? ` — ${v.image_ref}` : ''}`,
                }))}
              />
            )}
          </FormRow>
        </Panel>
      )}

      {step === 2 && (
        <Panel>
          <FormRow
            label='Namespace (optional)'
            controlId='pedestal-install-namespace'
          >
            <TextField
              id='pedestal-install-namespace'
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder={systemCode}
            />
          </FormRow>
          <FormRow
            label='Helm values override (optional)'
            controlId='pedestal-install-helm-values'
            labelBy='aria-labelledby'
          >
            {helmConfigQuery.isLoading ? (
              <SkeletonText />
            ) : (
              <div className='page-stack'>
                {helmConfigQuery.isError && (
                  <Chip tone='caution'>
                    {`Chart defaults unavailable: ${errMsg(helmConfigQuery.error)}`}
                  </Chip>
                )}
                <CodeEditor
                  id='pedestal-install-helm-values'
                  aria-labelledby='pedestal-install-helm-values-label'
                  value={helmValues}
                  onChange={(value) => {
                    setHelmTouched(true);
                    setHelmValues(value);
                  }}
                  language='yaml'
                  height='calc(var(--space-16) * 3.75)'
                />
                {!helmParse.ok && (
                  <Chip tone='warning'>{`YAML error: ${helmParse.error}`}</Chip>
                )}
              </div>
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

      <div className='wizard-actions'>
        {step > 0 && (
          <Button
            tone='secondary'
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
          >
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            tone='primary'
            disabled={!stepReady}
            onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
          >
            Next
          </Button>
        ) : (
          <Button
            tone='primary'
            onClick={onSubmit}
            disabled={installMutation.isPending || !helmParse.ok}
          >
            {installMutation.isPending ? 'Installing…' : 'Install'}
          </Button>
        )}
      </div>

      {installMutation.isPending && (
        <Alert title='Installing the release'>
          The backend may take up to 10 minutes to reconcile.
        </Alert>
      )}
    </>
  );
}
