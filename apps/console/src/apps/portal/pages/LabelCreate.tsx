import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { LabelCategory } from '@lincyaw/portal';
import { App as AntdApp, Select } from 'antd';

import { useCreateLabel } from '../api/labels';

const CATEGORY_OPTIONS = [
  { value: LabelCategory.System, label: 'System' },
  { value: LabelCategory.Config, label: 'Config' },
  { value: LabelCategory.Container, label: 'Container' },
  { value: LabelCategory.Dataset, label: 'Dataset' },
  { value: LabelCategory.Project, label: 'Project' },
  { value: LabelCategory.Injection, label: 'Injection' },
  { value: LabelCategory.Execution, label: 'Execution' },
];

export default function LabelCreate() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const create = useCreateLabel();

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<LabelCategory>(LabelCategory.Config);

  const submit = (): void => {
    if (!key.trim()) {
      void msg.error('key is required');
      return;
    }
    if (!value.trim()) {
      void msg.error('value is required');
      return;
    }
    create.mutate(
      { key, value, description, color, category },
      {
        onSuccess: (created) => {
          void msg.success(
            `Label ${created.key ?? key}=${created.value ?? value} created`
          );
          navigate('labels');
        },
        onError: (err) => {
          void msg.error(
            err instanceof Error ? err.message : 'Failed to create label'
          );
        },
      }
    );
  };

  return (
    <div className='page-wrapper'>
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
        <FormRow label='Key'>
          <TextField
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder='env'
          />
        </FormRow>
        <FormRow label='Value'>
          <TextField
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='production'
          />
        </FormRow>
        <FormRow label='Category'>
          <Select
            style={{ width: '100%' }}
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS}
          />
        </FormRow>
        <FormRow label='Description'>
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
          />
        </FormRow>
        <FormRow label='Color'>
          <TextField
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder='Optional hex/name'
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit} disabled={create.isPending}>
        {create.isPending ? 'Creating…' : 'Create'}
      </Button>
    </div>
  );
}
