import { useId } from 'react';

import {
  CodeEditor,
  EmptyState,
  MetricLabel,
  Panel,
  PanelTitle,
  Select,
  TextField,
} from '@lincyaw/aegis-ui';
import { Form, InputNumber, Radio, Slider } from 'antd';

import {
  CHAOS_BY_NAME,
  type GuidedInjectionSpec,
  PARAM_FIELDS,
  type ParamField,
  type ParamKey,
  paramProblem,
  type ParamValue,
} from '../../domain/injectSpec';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

interface ControlProps {
  id: string;
  field: ParamField;
  value: ParamValue | undefined;
  onChange: (value: ParamValue | undefined) => void;
}

function ParamControl({ id, field, value, onChange }: ControlProps) {
  switch (field.kind) {
    case 'number':
      return field.widget === 'slider' ? (
        <Slider
          id={id}
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : field.min}
          onChange={(v: number) => onChange(v)}
        />
      ) : (
        <InputNumber
          id={id}
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => onChange(v ?? undefined)}
        />
      );
    case 'text':
      return field.widget === 'yaml' ? (
        <CodeEditor
          language='yaml'
          height='calc(var(--space-16) * 2)'
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          placeholder={'action: throw\nargs:\n  - "x"'}
        />
      ) : (
        <TextField
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case 'choice':
      return field.widget === 'radio' ? (
        <Radio.Group
          id={id}
          value={value}
          onChange={(e) => onChange(String(e.target.value))}
        >
          {field.options.map((option) => (
            <Radio key={option} value={option}>
              {option}
            </Radio>
          ))}
        </Radio.Group>
      ) : (
        <Select
          id={id}
          value={typeof value === 'string' ? value : ''}
          placeholder={`Select ${field.label.toLowerCase()}`}
          options={field.options.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange(v)}
        />
      );
  }
}

function labelFor(field: ParamField, value: ParamValue | undefined): string {
  return field.widget === 'slider' && typeof value === 'number'
    ? `${field.label} · ${String(value)}`
    : field.label;
}

export function Step3Params({ spec, update }: Props) {
  const id = useId();
  const def = CHAOS_BY_NAME[spec.chaosType];

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

  const setParam = (key: ParamKey, value: ParamValue | undefined): void => {
    const params = { ...spec.params };
    if (value === undefined) {
      delete params[key];
    } else {
      params[key] = value;
    }
    update({ params });
  };

  return (
    <Panel
      title={<PanelTitle size='base'>3. Parameters · {def.name}</PanelTitle>}
    >
      <div className='page-stack'>
        <MetricLabel>{def.description}</MetricLabel>
        {def.params.length === 0 ? (
          <EmptyState
            title='No parameters'
            description='This fault only needs the target and the duration.'
          />
        ) : (
          <Form layout='vertical' component='div'>
            {def.params.map((key) => {
              const field = PARAM_FIELDS[key];
              const value = spec.params[key];
              const problem =
                value === undefined ? undefined : paramProblem(field, value);
              return (
                <Form.Item
                  key={key}
                  label={labelFor(field, value)}
                  required={field.required}
                  htmlFor={`${id}-${key}`}
                  validateStatus={problem ? 'error' : undefined}
                  help={problem}
                >
                  <ParamControl
                    id={`${id}-${key}`}
                    field={field}
                    value={value}
                    onChange={(v) => setParam(key, v)}
                  />
                </Form.Item>
              );
            })}
          </Form>
        )}
      </div>
    </Panel>
  );
}
