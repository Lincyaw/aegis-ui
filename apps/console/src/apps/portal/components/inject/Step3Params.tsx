import {
  EmptyState,
  FormRow,
  MetricLabel,
  NumberField,
  Panel,
  PanelTitle,
  Select,
  Slider,
  TextField,
} from '@lincyaw/aegis-ui';

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
  field: ParamField;
  value: ParamValue | undefined;
  onChange: (value: ParamValue | undefined) => void;
}

function ParamControl({ field, value, onChange }: ControlProps) {
  const problem = value === undefined ? undefined : paramProblem(field, value);
  switch (field.kind) {
    case 'number':
      return field.widget === 'slider' ? (
        <Slider
          ariaLabel={field.label}
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : field.min}
          formatValue={(v) => withUnit(v, field.unit)}
          onChange={onChange}
        />
      ) : (
        <NumberField
          ariaLabel={field.label}
          integer
          min={field.min}
          max={field.max}
          unit={field.unit}
          value={typeof value === 'number' ? value : undefined}
          error={problem}
          onChange={onChange}
        />
      );
    case 'text':
      return (
        <TextField
          aria-label={field.label}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          error={problem}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'choice':
      return (
        <Select
          ariaLabel={field.label}
          value={typeof value === 'string' ? value : ''}
          placeholder={`Select ${field.label.toLowerCase()}`}
          allowClear={!field.required}
          options={field.options.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange(v === '' ? undefined : v)}
        />
      );
  }
}

function withUnit(value: number, unit: string | undefined): string {
  if (unit === undefined) {
    return String(value);
  }
  return unit === '%' ? `${String(value)}%` : `${String(value)} ${unit}`;
}

function describe(field: ParamField): string {
  const parts = [field.required ? 'Required' : 'Optional'];
  if (field.kind === 'number' && field.widget === 'input') {
    parts.push(
      field.max === undefined
        ? `at least ${withUnit(field.min, field.unit)}`
        : `${String(field.min)}–${withUnit(field.max, field.unit)}`
    );
  }
  if (field.description !== undefined) {
    parts.push(field.description);
  }
  return parts.join(' · ');
}

export function Step3Params({ spec, update }: Props) {
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
      <MetricLabel>{def.description}</MetricLabel>
      {def.params.length === 0 ? (
        <EmptyState
          title='No parameters'
          description='This fault needs only its target. It runs for the fixed fault window.'
        />
      ) : (
        def.params.map((key) => {
          const field = PARAM_FIELDS[key];
          return (
            <FormRow
              key={key}
              label={field.label}
              description={describe(field)}
            >
              <ParamControl
                field={field}
                value={spec.params[key]}
                onChange={(v) => setParam(key, v)}
              />
            </FormRow>
          );
        })
      )}
    </Panel>
  );
}
