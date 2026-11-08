import { useState } from 'react';

import {
  Button,
  Checkbox,
  FormRow,
  PageHeader,
  Panel,
  Select,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
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
  const [nameError, setNameError] = useState<string>();
  const [description, setDescription] = useState('');
  const [type, setType] = useState('replay');
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const submit = (): void => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    create.mutate(
      { name: name.trim(), description, type, is_public: isPublic },
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
          void msg.error(`Failed to create dataset: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
      <PageHeader
        title='New dataset'
        description='Create an empty dataset.'
        action={
          <Button tone='secondary' onClick={() => navigate('datasets')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name' controlId='dataset-create-name'>
          <TextField
            id='dataset-create-name'
            value={name}
            error={nameError}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(undefined);
            }}
            placeholder='ts-fresh-replay-n100'
          />
        </FormRow>
        <FormRow label='Description' controlId='dataset-create-description'>
          <TextField
            id='dataset-create-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
          />
        </FormRow>
        <FormRow label='Type' controlId='dataset-create-type'>
          <Select
            id='dataset-create-type'
            value={type}
            onChange={setType}
            options={TYPES}
          />
        </FormRow>
        <FormRow label='Visibility'>
          <Checkbox label='Public' checked={isPublic} onChange={setIsPublic} />
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
