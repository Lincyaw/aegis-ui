import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  DangerZone,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  SkeletonText,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import {
  usePedestal,
  useRestartPedestal,
  useUninstallPedestal,
} from '../api/pedestals';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DeleteButton } from '../components/DeleteButton';
import { LoadError } from '../components/LoadError';

function stringifyValues(values: Record<string, unknown> | undefined): string {
  if (!values || Object.keys(values).length === 0) {
    return '';
  }
  return JSON.stringify(values, null, 2);
}

export default function PedestalDetail() {
  const { release: releaseParam } = useParams<{ release: string }>();
  const release = releaseParam ?? '';
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const { data, isLoading, isError, error } = usePedestal(release);
  const restartMutation = useRestartPedestal();
  const uninstallMutation = useUninstallPedestal();
  const [restartOpen, setRestartOpen] = useState(false);

  if (isLoading || isError || !data?.release) {
    return (
      <>
        <PageHeader title={`Pedestal ${release}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title='Failed to load the pedestal'
              notFound={{
                title: 'Pedestal not found',
                description: 'It may have been uninstalled.',
              }}
            />
          ) : (
            <EmptyState
              title='Pedestal not found'
              description='The server returned no release under this name.'
            />
          )}
        </Panel>
      </>
    );
  }

  const releaseName = data.release;

  const restart = (): void => {
    restartMutation.mutate(
      { release: releaseName },
      {
        onSuccess: () => {
          setRestartOpen(false);
          void msg.success(`Restarted ${releaseName}`);
        },
        onError: (err) => {
          setRestartOpen(false);
          void msg.error(`Restart failed: ${errMsg(err)}`);
        },
      }
    );
  };

  const uninstall = async (): Promise<void> => {
    await uninstallMutation.mutateAsync({
      release: releaseName,
      namespace: data.namespace,
    });
    void msg.success(`Uninstalled ${releaseName}`);
    navigate('pedestals');
  };

  const valuesYaml = stringifyValues(data.values);
  const managedLabel =
    data.managed === true
      ? 'managed'
      : (data.system ?? '').length > 0
        ? 'name-only'
        : 'unknown';
  const managedTone: 'ink' | 'caution' | 'ghost' =
    managedLabel === 'managed'
      ? 'ink'
      : managedLabel === 'name-only'
        ? 'caution'
        : 'ghost';

  return (
    <>
      <PageHeader
        title={`Pedestal ${data.release ?? ''}`}
        description={
          data.system
            ? `Helm release for ${data.system}.`
            : 'Helm release detail.'
        }
        action={
          <div className='page-action-row'>
            <Chip tone={managedTone}>{managedLabel}</Chip>
            <Button
              tone='secondary'
              onClick={() => setRestartOpen(true)}
              disabled={restartMutation.isPending}
            >
              {restartMutation.isPending ? 'Restarting…' : 'Restart'}
            </Button>
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Chart info</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'release',
              v: <MonoValue size='sm'>{data.release}</MonoValue>,
            },
            { k: 'system', v: data.system ?? '—' },
            {
              k: 'namespace',
              v: <MonoValue size='sm'>{data.namespace ?? '—'}</MonoValue>,
            },
            { k: 'chart', v: data.chart ?? '—' },
            {
              k: 'chart_version',
              v: <MonoValue size='sm'>{data.chart_version ?? '—'}</MonoValue>,
            },
            { k: 'status', v: data.status ?? '—' },
            { k: 'managed', v: <Chip tone={managedTone}>{managedLabel}</Chip> },
            {
              k: 'deployed_at',
              v: data.deployed_at ? (
                <TimeDisplay value={data.deployed_at} />
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Panel>

      <SectionDivider>Applied helm values</SectionDivider>
      <Panel>
        {valuesYaml.length === 0 ? (
          <EmptyState
            title='No user-supplied values'
            description='Chart was installed with defaults only.'
          />
        ) : (
          <CodeBlock language='json' code={valuesYaml} />
        )}
      </Panel>

      <DangerZone
        title='Danger zone'
        description='Uninstall removes all release resources from the cluster.'
      >
        <DeleteButton
          label='Uninstall'
          subject={`pedestal ${releaseName}`}
          consequence='This removes all release resources from the cluster.'
          typedConfirmation={releaseName}
          onDelete={uninstall}
        />
      </DangerZone>

      <ConfirmDialog
        open={restartOpen}
        title={`Restart ${releaseName}?`}
        description='Redeploys the release in place with the values applied before.'
        confirmLabel='Restart'
        pending={restartMutation.isPending}
        onConfirm={restart}
        onCancel={() => setRestartOpen(false)}
      />
    </>
  );
}
