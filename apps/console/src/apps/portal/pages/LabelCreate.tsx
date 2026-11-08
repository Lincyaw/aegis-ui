import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  Select,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { LabelCategory } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useCreateLabel } from '../api/labels';

const CATEGORIES: Array<{ value: LabelCategory; label: string }> = [
  { value: LabelCategory.System, label: 'System' },
  { value: LabelCategory.Config, label: 'Config' },
  { value: LabelCategory.Container, label: 'Container' },
  { value: LabelCategory.Dataset, label: 'Dataset' },
  { value: LabelCategory.Project, label: 'Project' },
  { value: LabelCategory.Injection, label: 'Injection' },
  { value: LabelCategory.Execution, label: 'Execution' },
];

interface FieldErrors {
  key?: string;
  value?: string;
}

export default function LabelCreate() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const create = useCreateLabel();

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<LabelCategory>(LabelCategory.Config);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (): void => {
    const next: FieldErrors = {
      key: key.trim() ? undefined : 'Key is required',
      value: value.trim() ? undefined : 'Value is required',
    };
    if (next.key || next.value) {
      setErrors(next);
      return;
    }
    create.mutate(
      { key: key.trim(), value: value.trim(), description, color, category },
      {
        onSuccess: (created) => {
          void msg.success(
            `Label ${created.key ?? key}=${created.value ?? value} created`
          );
          navigate('labels');
        },
        onError: (err) => {
          void msg.error(`Failed to create label: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
      <PageHeader
        title='New label'
        description='Create a custom label (key-value pair) for organizing resources.'
        action={
          <Button tone='secondary' onClick={() => navigate('labels')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Key' controlId='label-create-key'>
          <TextField
            id='label-create-key'
            value={key}
            error={errors.key}
            onChange={(e) => {
              setKey(e.target.value);
              setErrors({ ...errors, key: undefined });
            }}
            placeholder='env'
          />
        </FormRow>
        <FormRow label='Value' controlId='label-create-value'>
          <TextField
            id='label-create-value'
            value={value}
            error={errors.value}
            onChange={(e) => {
              setValue(e.target.value);
              setErrors({ ...errors, value: undefined });
            }}
            placeholder='production'
          />
        </FormRow>
        <FormRow label='Category' controlId='label-create-category'>
          <Select
            id='label-create-category'
            value={String(category)}
            onChange={(v) =>
              setCategory(
                CATEGORIES.find((c) => String(c.value) === v)?.value ??
                  LabelCategory.Config
              )
            }
            options={CATEGORIES.map((c) => ({
              value: String(c.value),
              label: c.label,
            }))}
          />
        </FormRow>
        <FormRow label='Description' controlId='label-create-description'>
          <TextField
            id='label-create-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
          />
        </FormRow>
        <FormRow label='Color' controlId='label-create-color'>
          <TextField
            id='label-create-color'
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder='Optional hex/name'
          />
        </FormRow>
      </Panel>
      <div className='wizard-actions'>
        <Button tone='primary' onClick={submit} disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </>
  );
}
