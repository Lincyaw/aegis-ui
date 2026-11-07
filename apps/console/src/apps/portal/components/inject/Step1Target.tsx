import { useId } from 'react';

import {
  Chip,
  Panel,
  PanelTitle,
  SectionDivider,
  Select,
  TextField,
} from '@lincyaw/aegis-ui';
import { Form, Radio } from 'antd';

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

export function Step1Target({ spec, update }: Props) {
  const id = useId();
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

  const appHelp = candidatesQuery.isError ? (
    <Chip tone='warning'>
      {`Failed to load candidates: ${errMsg(candidatesQuery.error)} — enter the app by hand.`}
    </Chip>
  ) : !candidatesReady ? (
    spec.namespaceMode === 'specific' ? (
      'Pick a system and namespace first to load candidates.'
    ) : (
      'Pick a system first to load candidates.'
    )
  ) : spec.namespaceMode === 'specific' ? (
    'Candidates discovered for this system + namespace.'
  ) : (
    'Candidates discovered for this system across all namespaces.'
  );

  return (
    <Panel title={<PanelTitle size='base'>1. Target</PanelTitle>}>
      <Form layout='vertical' component='div'>
        {templates.length > 0 && (
          <Form.Item label='Load from template' htmlFor={`${id}-template`}>
            <Select
              id={`${id}-template`}
              value=''
              placeholder='Choose a saved template'
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(templateId) => {
                const template = templates.find((t) => t.id === templateId);
                if (template) {
                  update(template.spec);
                }
              }}
            />
          </Form.Item>
        )}

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
          <Form.Item label='Namespace name' required htmlFor={`${id}-ns`}>
            <TextField
              id={`${id}-ns`}
              value={spec.namespace}
              onChange={(e) => update({ namespace: e.target.value })}
              placeholder='e.g. ts-1'
            />
          </Form.Item>
        )}

        <Form.Item
          label='System'
          required
          htmlFor={`${id}-system`}
          extra={
            systemsQuery.isError ? (
              <Chip tone='warning'>
                {`Failed to load systems: ${errMsg(systemsQuery.error)} — enter the system code by hand.`}
              </Chip>
            ) : (
              'Loaded from the chaos systems registry.'
            )
          }
        >
          {systemsQuery.isError ? (
            <TextField
              id={`${id}-system`}
              value={spec.systemCode}
              onChange={(e) => update({ systemCode: e.target.value, app: '' })}
              placeholder='system short_code'
            />
          ) : (
            <Select
              id={`${id}-system`}
              value={spec.systemCode}
              disabled={systemsQuery.isLoading}
              placeholder={
                systemsQuery.isLoading ? 'Loading systems…' : 'Select a system'
              }
              options={systemOptions}
              onChange={(value) => update({ systemCode: value, app: '' })}
            />
          )}
        </Form.Item>

        <Form.Item
          label='System type'
          htmlFor={`${id}-system-type`}
          extra='free-form chaos.system_type tag.'
        >
          <TextField
            id={`${id}-system-type`}
            value={spec.systemType}
            onChange={(e) => update({ systemType: e.target.value })}
            placeholder='e.g. ts'
          />
        </Form.Item>

        <SectionDivider>App</SectionDivider>
        <Form.Item
          label='App / Deployment'
          required
          htmlFor={`${id}-app`}
          extra={appHelp}
        >
          {candidatesQuery.isError || !candidatesReady ? (
            <TextField
              id={`${id}-app`}
              value={spec.app}
              onChange={(e) => update({ app: e.target.value })}
              placeholder='deployment label'
            />
          ) : (
            <Select
              id={`${id}-app`}
              value={spec.app}
              disabled={candidatesQuery.isLoading}
              placeholder={
                candidatesQuery.isLoading
                  ? 'Loading candidates…'
                  : 'Select an app / deployment'
              }
              options={appOptions}
              onChange={(value) => update({ app: value })}
            />
          )}
        </Form.Item>

        <Form.Item
          label='Container (optional)'
          htmlFor={`${id}-container`}
          extra='leave blank to target the first container.'
        >
          <TextField
            id={`${id}-container`}
            value={spec.container}
            onChange={(e) => update({ container: e.target.value })}
            placeholder='e.g. main'
          />
        </Form.Item>

        <Form.Item
          label='Target service (optional)'
          htmlFor={`${id}-service`}
          extra='used by HTTP / JVM faults that scope per-service.'
        >
          <TextField
            id={`${id}-service`}
            value={spec.targetService}
            onChange={(e) => update({ targetService: e.target.value })}
            placeholder='e.g. checkoutservice'
          />
        </Form.Item>
      </Form>
    </Panel>
  );
}
