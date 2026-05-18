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
  TextField,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Modal, Spin } from 'antd';

import {
  usePedestal,
  useRestartPedestal,
  useUninstallPedestal,
} from '../api/pedestals';

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
  const { message: msg, modal } = AntdApp.useApp();

  const { data, isLoading } = usePedestal(release);
  const restartMutation = useRestartPedestal();
  const uninstallMutation = useUninstallPedestal();

  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  if (isLoading && !data) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Pedestal ${release}`} />
        <Panel>
          <Spin />
        </Panel>
      </div>
    );
  }

  if (!data || !data.release) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Pedestal not found' />
        <Panel>
          <EmptyState
            title='Not found'
            description='Pedestal may have been uninstalled.'
          />
        </Panel>
      </div>
    );
  }

  const onRestart = (): void => {
    modal.confirm({
      title: `Restart ${data.release ?? ''}?`,
      content:
        'Redeploys the release in-place with the previously-applied values.',
      okText: 'Restart',
      onOk: async () => {
        try {
          await restartMutation.mutateAsync({ release: data.release ?? '' });
          void msg.success(`Restarted ${data.release ?? ''}`);
        } catch {
          void msg.error('Restart failed');
        }
      },
    });
  };

  const openUninstall = (): void => {
    setConfirmName('');
    setUninstallOpen(true);
  };

  const confirmUninstall = async (): Promise<void> => {
    if (confirmName !== data.release) {
      void msg.error('Release name does not match');
      return;
    }
    try {
      await uninstallMutation.mutateAsync({
        release: data.release ?? '',
        namespace: data.namespace,
      });
      void msg.success(`Uninstalled ${data.release ?? ''}`);
      setUninstallOpen(false);
      navigate('pedestals');
    } catch {
      void msg.error('Uninstall failed');
    }
  };

  const valuesYaml = stringifyValues(data.values);
  const managedLabel =
    data.managed === true
      ? 'managed'
      : (data.system ?? '').length > 0
        ? 'name-only'
        : 'unknown';
  const managedTone: 'ink' | 'warning' | 'ghost' =
    managedLabel === 'managed'
      ? 'ink'
      : managedLabel === 'name-only'
        ? 'warning'
        : 'ghost';

  return (
    <div className='page-wrapper'>
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
              onClick={onRestart}
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
        <Button tone='secondary' onClick={openUninstall}>
          Uninstall
        </Button>
      </DangerZone>

      <Modal
        title={`Uninstall ${data.release ?? ''}?`}
        open={uninstallOpen}
        onCancel={() => setUninstallOpen(false)}
        onOk={() => {
          void confirmUninstall();
        }}
        okText='Uninstall'
        okButtonProps={{
          danger: true,
          disabled: confirmName !== data.release || uninstallMutation.isPending,
          loading: uninstallMutation.isPending,
        }}
        width={520}
      >
        <p>
          This removes all release resources from the cluster. Type the release
          name <strong>{data.release}</strong> to confirm.
        </p>
        <TextField
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={data.release}
        />
      </Modal>
    </div>
  );
}
