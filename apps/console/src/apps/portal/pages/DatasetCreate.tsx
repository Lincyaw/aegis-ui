import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Select } from 'antd';

import { useCreateDataset } from '../api/datasets';

const TYPES = [
  { value: 'replay', label: 'replay' },
  { value: 'eval', label: 'eval' },
  { value: 'regression', label: 'regression' },
];

export default function DatasetCreate() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const create = useCreateDataset();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('replay');
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    if (!type) {
      void msg.error('type is required');
      return;
    }
    create.mutate(
      { name, description, type, is_public: isPublic },
      {
        onSuccess: (created) => {
          void msg.success(`Dataset ${created.name ?? name} created`);
          if (created.id !== undefined) {
            navigate(`datasets/${String(created.id)}`);
          } else {
            navigate('datasets');
          }
        },
        onError: (err) => {
          void msg.error(
            err instanceof Error ? err.message : 'Failed to create dataset'
          );
        },
      }
    );
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New dataset'
        description='Create an empty dataset; add injections from the Injections list.'
        action={
          <Button tone='secondary' onClick={() => navigate('datasets')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name'>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='ts-fresh-replay-n100'
          />
        </FormRow>
        <FormRow label='Description'>
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
          />
        </FormRow>
        <FormRow label='Type'>
          <Select
            style={{ width: '100%' }}
            value={type}
            onChange={setType}
            options={TYPES}
          />
        </FormRow>
        <FormRow label='Visibility'>
          <Select
            style={{ width: '100%' }}
            value={isPublic ? 'public' : 'private'}
            onChange={(v) => setIsPublic(v === 'public')}
            options={[
              { value: 'private', label: 'private' },
              { value: 'public', label: 'public' },
            ]}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit} disabled={create.isPending}>
        {create.isPending ? 'Creating…' : 'Create'}
      </Button>
    </div>
  );
}
