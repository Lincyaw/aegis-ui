import { Chip, Panel, PanelTitle, SectionDivider } from '@lincyaw/aegis-ui';
import { Form, Input, InputNumber, Radio, Select, Switch } from 'antd';

import { useInjectCandidates, useSystems } from '../../api/systems';
import type { GuidedInjectionSpec, NamespaceMode } from '../../mocks/types';
import { useInjectBatch } from '../../state/inject-batch';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

export function Step1Target({ spec, update }: Props) {
  const templates = useInjectBatch((s) => s.templates);
  const systemsQuery = useSystems();
  const candidatesNamespace =
    spec.namespaceMode === 'specific' ? spec.namespace : undefined;
  const candidatesQuery = useInjectCandidates(
    spec.systemCode,
    candidatesNamespace
  );

  const systemOptions = (systemsQuery.data ?? []).map((sys) => ({
    value: sys.name ?? '',
    label:
      sys.display_name && sys.name
        ? `${sys.display_name} (${sys.name})`
        : (sys.display_name ?? sys.name ?? ''),
  }));

  const appOptions = Array.from(
    new Set(
      (candidatesQuery.data ?? [])
        .map((c) => c.app)
        .filter((a): a is string => Boolean(a))
    )
  ).map((a) => ({ value: a, label: a }));

  const systemsFailed = systemsQuery.isError;
  const candidatesFailed = candidatesQuery.isError;
  const candidatesReady =
    spec.systemCode.length > 0 &&
    (spec.namespaceMode !== 'specific' || spec.namespace.length > 0);

  return (
    <Panel title={<PanelTitle size='base'>1. Target</PanelTitle>}>
      <Form layout='vertical'>
        <Form.Item label='Load from template'>
          <Select
            placeholder='choose a saved template (optional)'
            allowClear
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(id?: string) => {
              if (!id) {
                return;
              }
              const t = templates.find((x) => x.id === id);
              if (t) {
                update(t.spec);
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label='Namespace allocation'
          required
          extra='matches aegisctl inject guided --auto / --auto --allow-bootstrap.'
        >
          <Radio.Group
            value={spec.namespaceMode}
            onChange={(e) =>
              update({ namespaceMode: e.target.value as NamespaceMode })
            }
          >
            <Radio value='specific'>Specific namespace</Radio>
            <Radio value='auto'>Auto-allocate from pool</Radio>
            <Radio value='auto-bootstrap'>Auto + allow bootstrap</Radio>
          </Radio.Group>
        </Form.Item>

        {spec.namespaceMode === 'specific' && (
          <Form.Item label='Namespace name' required>
            <Input
              value={spec.namespace}
              onChange={(e) => update({ namespace: e.target.value })}
              placeholder='e.g. ts-1'
            />
          </Form.Item>
        )}

        <Form.Item
          label='System'
          required
          extra={
            systemsFailed ? (
              <Chip tone='warning'>
                Failed to load systems — using manual entry
              </Chip>
            ) : (
              'Loaded from the chaos systems registry.'
            )
          }
        >
          {systemsFailed ? (
            <Input
              value={spec.systemCode}
              onChange={(e) =>
                update({ systemCode: e.target.value, app: '' })
              }
              placeholder='system short_code'
            />
          ) : (
            <Select
              value={spec.systemCode || undefined}
              loading={systemsQuery.isLoading}
              showSearch
              optionFilterProp='label'
              placeholder='select a system'
              options={systemOptions}
              onChange={(value: string) =>
                update({ systemCode: value, app: '' })
              }
            />
          )}
        </Form.Item>

        <Form.Item label='System type' extra='free-form chaos.system_type tag.'>
          <Input
            value={spec.systemType}
            onChange={(e) => update({ systemType: e.target.value })}
            placeholder='e.g. ts'
          />
        </Form.Item>

        <SectionDivider>App</SectionDivider>
        <Form.Item
          label='App / Deployment'
          required
          extra={
            candidatesFailed ? (
              <Chip tone='warning'>
                Failed to load candidates — using manual entry
              </Chip>
            ) : !candidatesReady ? (
              spec.namespaceMode === 'specific'
                ? 'Pick a system and namespace first to load candidates.'
                : 'Pick a system first to load candidates.'
            ) : spec.namespaceMode === 'specific' ? (
              'Candidates discovered for this system + namespace.'
            ) : (
              'Candidates discovered for this system across all namespaces.'
            )
          }
        >
          {candidatesFailed || !candidatesReady ? (
            <Input
              value={spec.app}
              onChange={(e) => update({ app: e.target.value })}
              placeholder='deployment label'
            />
          ) : (
            <Select
              value={spec.app || undefined}
              loading={candidatesQuery.isLoading}
              showSearch
              optionFilterProp='label'
              placeholder='select an app / deployment'
              options={appOptions}
              onChange={(value: string) => update({ app: value })}
            />
          )}
        </Form.Item>

        <Form.Item
          label='Container (optional)'
          extra='leave blank to target the first container.'
        >
          <Input
            value={spec.container}
            onChange={(e) => update({ container: e.target.value })}
            placeholder='e.g. main'
          />
        </Form.Item>

        <Form.Item
          label='Target service (optional)'
          extra='used by HTTP / JVM faults that scope per-service.'
        >
          <Input
            value={spec.targetService}
            onChange={(e) => update({ targetService: e.target.value })}
            placeholder='e.g. checkoutservice'
          />
        </Form.Item>

        <SectionDivider>Pedestal bootstrap</SectionDivider>
        <Form.Item label='Install if missing' extra='maps to --install.'>
          <Switch
            checked={spec.install}
            onChange={(v) => update({ install: v })}
          />
        </Form.Item>
        {spec.install && (
          <Form.Item label='Ready timeout (seconds)'>
            <InputNumber
              min={30}
              max={1800}
              step={30}
              value={spec.readyTimeoutSec}
              onChange={(v) => update({ readyTimeoutSec: Number(v ?? 180) })}
            />
          </Form.Item>
        )}
      </Form>
    </Panel>
  );
}
