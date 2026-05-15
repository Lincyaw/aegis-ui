import { Form, Input, InputNumber, Radio, Select, Switch } from 'antd';

import { Chip, MonoValue, Panel, PanelTitle, SectionDivider } from '@lincyaw/aegis-ui';

import { useMockStore } from '../../mocks';
import type { GuidedInjectionSpec, NamespaceMode } from '../../mocks/types';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

export function Step1Target({ spec, update }: Props) {
  const systems = useMockStore((s) => s.systems);
  const templates = useMockStore((s) => s.injectionTemplates);
  const selectedSystem = systems.find((s) => s.code === spec.systemCode);
  const appOptions = selectedSystem?.apps ?? [];

  return (
    <Panel title={<PanelTitle size='base'>1. Target</PanelTitle>}>
      <Form layout='vertical'>
        <Form.Item label='Load from template'>
          <Select
            placeholder='choose a saved template (optional)'
            allowClear
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(id?: string) => {
              if (!id) return;
              const t = templates.find((x) => x.id === id);
              if (t) update(t.spec);
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
            onChange={(e) => update({ namespaceMode: e.target.value as NamespaceMode })}
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

        <Form.Item label='System' required>
          <Select
            value={spec.systemCode || undefined}
            onChange={(code: string) => {
              const sys = systems.find((s) => s.code === code);
              update({
                systemCode: code,
                systemType: sys?.systemType ?? '',
                app: '',
              });
            }}
            placeholder='select system short_code'
            options={systems.map((s) => ({
              value: s.code,
              label: `${s.code} — ${s.name}`,
              disabled: !s.enabled,
            }))}
          />
        </Form.Item>

        {selectedSystem && (
          <>
            <SectionDivider>
              <MonoValue size='sm'>{selectedSystem.code}</MonoValue>{' '}
              <Chip tone='ghost'>{selectedSystem.systemType}</Chip>
            </SectionDivider>
            <Form.Item label='App / Deployment' required>
              <Select
                value={spec.app || undefined}
                onChange={(v: string) => update({ app: v })}
                showSearch
                placeholder='pick a deployment label'
                options={appOptions.map((a) => ({ value: a, label: a }))}
              />
            </Form.Item>
          </>
        )}

        <Form.Item label='Container (optional)' extra='leave blank to target the first container.'>
          <Input
            value={spec.container}
            onChange={(e) => update({ container: e.target.value })}
            placeholder='e.g. main'
          />
        </Form.Item>

        <Form.Item label='Target service (optional)' extra='used by HTTP / JVM faults that scope per-service.'>
          <Input
            value={spec.targetService}
            onChange={(e) => update({ targetService: e.target.value })}
            placeholder='e.g. checkoutservice'
          />
        </Form.Item>

        <SectionDivider>Pedestal bootstrap</SectionDivider>
        <Form.Item label='Install if missing' extra='maps to --install.'>
          <Switch checked={spec.install} onChange={(v) => update({ install: v })} />
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
