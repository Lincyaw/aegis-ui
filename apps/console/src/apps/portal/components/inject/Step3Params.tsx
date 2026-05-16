import { EmptyState, MetricLabel, Panel, PanelTitle } from '@lincyaw/aegis-ui';
import { Form, Input, InputNumber, Radio, Select, Slider } from 'antd';

import type { GuidedInjectionSpec } from '../../mocks/types';

import { CHAOS_BY_NAME, type FieldKey, REQUIRED_FIELDS } from './paramSchema';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

function FieldRow({
  field,
  spec,
  update,
}: {
  field: FieldKey;
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}) {
  const required = REQUIRED_FIELDS[field];
  const itemProps = { required };

  switch (field) {
    case 'container':
      return (
        <Form.Item label='Container' {...itemProps}>
          <Input
            value={spec.container}
            onChange={(e) => update({ container: e.target.value })}
          />
        </Form.Item>
      );
    case 'memType':
      return (
        <Form.Item label='Memory type' {...itemProps}>
          <Radio.Group
            value={spec.memType ?? 'ram'}
            onChange={(e) => update({ memType: e.target.value })}
          >
            <Radio value='ram'>ram</Radio>
            <Radio value='swap'>swap</Radio>
            <Radio value='cache'>cache</Radio>
          </Radio.Group>
        </Form.Item>
      );
    case 'memSize':
      return (
        <Form.Item label='Memory size (MiB)' {...itemProps}>
          <InputNumber
            min={1}
            max={65536}
            value={spec.memSize}
            onChange={(v) => update({ memSize: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'memWorker':
      return (
        <Form.Item label='Memory workers' {...itemProps}>
          <InputNumber
            min={1}
            max={64}
            value={spec.memWorker}
            onChange={(v) => update({ memWorker: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'cpuLoad':
      return (
        <Form.Item label={`CPU load (${spec.cpuLoad ?? 50}%)`} {...itemProps}>
          <Slider
            min={0}
            max={100}
            value={spec.cpuLoad ?? 50}
            onChange={(v: number) => update({ cpuLoad: v })}
          />
        </Form.Item>
      );
    case 'cpuWorker':
      return (
        <Form.Item label='CPU workers' {...itemProps}>
          <InputNumber
            min={1}
            max={64}
            value={spec.cpuWorker}
            onChange={(v) => update({ cpuWorker: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'cpuCount':
      return (
        <Form.Item label='CPU count (optional)'>
          <InputNumber
            min={0}
            max={128}
            value={spec.cpuCount}
            onChange={(v) => update({ cpuCount: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'direction':
      return (
        <Form.Item label='Direction' {...itemProps}>
          <Radio.Group
            value={spec.direction ?? 'to'}
            onChange={(e) => update({ direction: e.target.value })}
          >
            <Radio value='to'>to</Radio>
            <Radio value='from'>from</Radio>
            <Radio value='both'>both</Radio>
          </Radio.Group>
        </Form.Item>
      );
    case 'latencyMs':
      return (
        <Form.Item label='Latency (ms)' {...itemProps}>
          <InputNumber
            min={1}
            max={600000}
            value={spec.latencyMs}
            onChange={(v) => update({ latencyMs: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'jitter':
      return (
        <Form.Item label='Jitter (ms)'>
          <InputNumber
            min={0}
            max={60000}
            value={spec.jitter}
            onChange={(v) => update({ jitter: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'correlation':
      return (
        <Form.Item label={`Correlation (${spec.correlation ?? 0}%)`}>
          <Slider
            min={0}
            max={100}
            value={spec.correlation ?? 0}
            onChange={(v: number) => update({ correlation: v })}
          />
        </Form.Item>
      );
    case 'loss':
      return (
        <Form.Item label={`Loss (${spec.loss ?? 0}%)`} {...itemProps}>
          <Slider
            min={0}
            max={100}
            value={spec.loss ?? 0}
            onChange={(v: number) => update({ loss: v })}
          />
        </Form.Item>
      );
    case 'duplicate':
      return (
        <Form.Item label={`Duplicate (${spec.duplicate ?? 0}%)`} {...itemProps}>
          <Slider
            min={0}
            max={100}
            value={spec.duplicate ?? 0}
            onChange={(v: number) => update({ duplicate: v })}
          />
        </Form.Item>
      );
    case 'corrupt':
      return (
        <Form.Item label={`Corrupt (${spec.corrupt ?? 0}%)`} {...itemProps}>
          <Slider
            min={0}
            max={100}
            value={spec.corrupt ?? 0}
            onChange={(v: number) => update({ corrupt: v })}
          />
        </Form.Item>
      );
    case 'rate':
      return (
        <Form.Item label='Rate (kbit/s)' {...itemProps}>
          <InputNumber
            min={1}
            max={10_000_000}
            value={spec.rate}
            onChange={(v) => update({ rate: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'limit':
      return (
        <Form.Item label='Limit (bytes)'>
          <InputNumber
            min={0}
            max={1_000_000_000}
            value={spec.limit}
            onChange={(v) => update({ limit: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'buffer':
      return (
        <Form.Item label='Buffer (bytes)'>
          <InputNumber
            min={0}
            max={1_000_000_000}
            value={spec.buffer}
            onChange={(v) => update({ buffer: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'route':
      return (
        <Form.Item label='Route' {...itemProps}>
          <Input
            value={spec.route}
            onChange={(e) => update({ route: e.target.value })}
            placeholder='/api/checkout'
          />
        </Form.Item>
      );
    case 'httpMethod':
      return (
        <Form.Item label='HTTP method' {...itemProps}>
          <Select
            value={spec.httpMethod}
            onChange={(v: string) => update({ httpMethod: v })}
            options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
            placeholder='select method'
          />
        </Form.Item>
      );
    case 'targetService':
      return (
        <Form.Item label='Target service'>
          <Input
            value={spec.targetService}
            onChange={(e) => update({ targetService: e.target.value })}
          />
        </Form.Item>
      );
    case 'bodyType':
      return (
        <Form.Item label='Body type' {...itemProps}>
          <Radio.Group
            value={spec.bodyType ?? 'json'}
            onChange={(e) => update({ bodyType: e.target.value })}
          >
            <Radio value='json'>json</Radio>
            <Radio value='text'>text</Radio>
            <Radio value='xml'>xml</Radio>
          </Radio.Group>
        </Form.Item>
      );
    case 'body':
      return (
        <Form.Item label='Body' {...itemProps}>
          <Input.TextArea
            rows={4}
            value={spec.body}
            onChange={(e) => update({ body: e.target.value })}
            placeholder='{"error": "synthetic"}'
          />
        </Form.Item>
      );
    case 'replacePath':
      return (
        <Form.Item label='Replace path' {...itemProps}>
          <Input
            value={spec.replacePath}
            onChange={(e) => update({ replacePath: e.target.value })}
            placeholder='/api/v2/checkout'
          />
        </Form.Item>
      );
    case 'replaceMethod':
      return (
        <Form.Item label='Replace method' {...itemProps}>
          <Select
            value={spec.replaceMethod}
            onChange={(v: string) => update({ replaceMethod: v })}
            options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Form.Item>
      );
    case 'returnCode':
      return (
        <Form.Item label='HTTP return code' {...itemProps}>
          <InputNumber
            min={100}
            max={599}
            value={spec.returnCode}
            onChange={(v) => update({ returnCode: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'domain':
      return (
        <Form.Item label='Domain (host or regex)' {...itemProps}>
          <Input
            value={spec.domain}
            onChange={(e) => update({ domain: e.target.value })}
            placeholder='auth.example.com'
          />
        </Form.Item>
      );
    case 'timeOffset':
      return (
        <Form.Item label='Time offset (seconds, signed)' {...itemProps}>
          <InputNumber
            min={-86400}
            max={86400}
            value={spec.timeOffset}
            onChange={(v) => update({ timeOffset: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'latencyDuration':
      return (
        <Form.Item label='Latency duration (s)'>
          <InputNumber
            min={1}
            max={3600}
            value={spec.latencyDuration}
            onChange={(v) => update({ latencyDuration: v ?? undefined })}
          />
        </Form.Item>
      );
    case 'class':
      return (
        <Form.Item label='Java class' {...itemProps}>
          <Input
            value={spec.class}
            onChange={(e) => update({ class: e.target.value })}
            placeholder='com.example.UserService'
          />
        </Form.Item>
      );
    case 'method':
      return (
        <Form.Item label='Method' {...itemProps}>
          <Input
            value={spec.method}
            onChange={(e) => update({ method: e.target.value })}
            placeholder='login'
          />
        </Form.Item>
      );
    case 'database':
      return (
        <Form.Item label='MySQL database' {...itemProps}>
          <Input
            value={spec.database}
            onChange={(e) => update({ database: e.target.value })}
          />
        </Form.Item>
      );
    case 'table':
      return (
        <Form.Item label='MySQL table'>
          <Input
            value={spec.table}
            onChange={(e) => update({ table: e.target.value })}
          />
        </Form.Item>
      );
    case 'operation':
      return (
        <Form.Item label='Operation' {...itemProps}>
          <Select
            value={spec.operation}
            onChange={(v) => update({ operation: v })}
            options={[
              { value: 'select', label: 'select' },
              { value: 'insert', label: 'insert' },
              { value: 'update', label: 'update' },
              { value: 'delete', label: 'delete' },
            ]}
          />
        </Form.Item>
      );
    case 'returnType':
      return (
        <Form.Item label='Return type' {...itemProps}>
          <Select
            value={spec.returnType}
            onChange={(v) => update({ returnType: v })}
            options={[
              { value: 'string', label: 'string' },
              { value: 'int', label: 'int' },
              { value: 'bool', label: 'bool' },
              { value: 'object', label: 'object' },
              { value: 'null', label: 'null' },
            ]}
          />
        </Form.Item>
      );
    case 'returnOpt':
      return (
        <Form.Item label='Return value'>
          <Input
            value={spec.returnOpt}
            onChange={(e) => update({ returnOpt: e.target.value })}
            placeholder='"injected"'
          />
        </Form.Item>
      );
    case 'exceptionOpt':
      return (
        <Form.Item label='Exception expression' {...itemProps}>
          <Input
            value={spec.exceptionOpt}
            onChange={(e) => update({ exceptionOpt: e.target.value })}
            placeholder='java.lang.RuntimeException("aegis")'
          />
        </Form.Item>
      );
    case 'mutatorConfig':
      return (
        <Form.Item label='Mutator config (YAML)' {...itemProps}>
          <Input.TextArea
            rows={6}
            value={spec.mutatorConfig}
            onChange={(e) => update({ mutatorConfig: e.target.value })}
            placeholder='action: throw\nargs:\n  - "x"'
          />
        </Form.Item>
      );
    default:
      return null;
  }
}

export function Step3Params({ spec, update }: Props) {
  const def = spec.chaosType ? CHAOS_BY_NAME[spec.chaosType] : undefined;

  if (!def) {
    return (
      <Panel title={<PanelTitle size='base'>3. Parameters</PanelTitle>}>
        <EmptyState
          title='No chaos type selected'
          description='Go back to step 2 and pick a fault.'
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={<PanelTitle size='base'>3. Parameters · {def.name}</PanelTitle>}
    >
      <MetricLabel>{def.description}</MetricLabel>
      <Form layout='vertical' style={{ marginTop: 'var(--space-3)' }}>
        {def.fields.map((f) => (
          <FieldRow key={f} field={f} spec={spec} update={update} />
        ))}
      </Form>
    </Panel>
  );
}
