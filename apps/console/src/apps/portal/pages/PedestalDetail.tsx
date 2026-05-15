import { App as AntdApp, Modal } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  CodeBlock,
  CodeEditor,
  DangerZone,
  DataList,
  DiffViewer,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';
import type { MockInjection } from '../mocks/types';

export default function PedestalDetail() {
  const { id } = useParams<{ id: string }>();
  const href = useAppHref();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const pedestal = useMockStore((s) => s.pedestals.find((p) => p.id === id));
  const recent = useMockStore((s) =>
    s.injections.filter((i) => i.systemCode === pedestal?.systemCode).slice(0, 6),
  );
  const restartPedestal = useMockStore((s) => s.restartPedestal);
  const uninstallPedestal = useMockStore((s) => s.uninstallPedestal);
  const applyPedestalOverrides = useMockStore((s) => s.applyPedestalOverrides);

  const [overridesOpen, setOverridesOpen] = useState(false);
  const [draftValues, setDraftValues] = useState('');

  if (!pedestal) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Pedestal not found' />
        <Panel>
          <EmptyState title='Not found' description='Pedestal may have been uninstalled.' />
        </Panel>
      </div>
    );
  }

  const onRestart = (): void => {
    restartPedestal(pedestal.id);
    void msg.success(`Restarting ${pedestal.namespace}`);
  };

  const onUninstall = (): void => {
    modal.confirm({
      title: `Uninstall ${pedestal.namespace}?`,
      content: 'This removes all release resources from the cluster.',
      okText: 'Uninstall',
      okButtonProps: { danger: true },
      onOk: () => {
        uninstallPedestal(pedestal.id);
        void msg.success(`Uninstalled ${pedestal.namespace}`);
        navigate('pedestals');
      },
    });
  };

  const openOverrides = (): void => {
    setDraftValues(pedestal.helmValues);
    setOverridesOpen(true);
  };

  const applyOverrides = (): void => {
    applyPedestalOverrides(pedestal.id, draftValues);
    void msg.success('Overrides applied; pedestal restarting');
    setOverridesOpen(false);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Pedestal ${pedestal.namespace}`}
        description={`Helm release for ${pedestal.systemCode}.`}
        action={
          <div className='page-action-row'>
            <StatusChip status={pedestal.status} />
            <Button tone='primary'
              onClick={() => navigate(`injections/new?system=${pedestal.systemCode}`)}>
              Inject first fault
            </Button>
            <Button tone='secondary' onClick={onRestart}>Restart</Button>
            <Button tone='secondary' onClick={openOverrides}>Apply overrides</Button>
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'system', v: <Link to={href(`systems/${pedestal.systemCode}`)}>{pedestal.systemCode}</Link> },
            { k: 'namespace', v: <MonoValue size='sm'>{pedestal.namespace}</MonoValue> },
            { k: 'version', v: <MonoValue size='sm'>{pedestal.version}</MonoValue> },
            { k: 'status', v: <StatusChip status={pedestal.status} /> },
            { k: 'age', v: pedestal.age },
          ]}
        />
      </Panel>

      <SectionDivider>Helm values</SectionDivider>
      <Panel>
        <CodeBlock language='yaml' code={pedestal.helmValues} />
      </Panel>

      <SectionDivider>Recent injections</SectionDivider>
      <Panel>
        {recent.length === 0 ? (
          <EmptyState title='No injections yet' description='Inject a fault to populate.' />
        ) : (
          <DataList<MockInjection>
            items={recent}
            columns={[
              {
                key: 'id',
                label: 'Injection',
                render: (r) => (
                  <Link to={href(`injections/${r.id}`)}>{r.id}</Link>
                ),
              },
              { key: 'name', label: 'Fault', render: (r) => r.name },
              { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
            ]}
          />
        )}
      </Panel>

      <DangerZone
        title='Danger zone'
        description='Uninstall removes all release resources from the cluster.'
      >
        <Button tone='secondary' onClick={onUninstall}>Uninstall</Button>
      </DangerZone>

      <Modal
        title='Apply helm overrides'
        open={overridesOpen}
        onCancel={() => setOverridesOpen(false)}
        onOk={applyOverrides}
        okText='Apply'
        width={720}
      >
        <div style={{ marginBottom: 12 }}>
          <CodeEditor
            value={draftValues}
            onChange={setDraftValues}
            language='yaml'
            height={220}
          />
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Diff vs current:</div>
        <DiffViewer
          oldValue={pedestal.helmValues}
          newValue={draftValues}
          leftTitle='current'
          rightTitle='draft'
        />
      </Modal>
    </div>
  );
}
