import { App as AntdApp } from 'antd';
import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function DatasetCreate() {
  const navigate = useAppNavigate();
  const createDataset = useMockStore((s) => s.createDataset);
  const { message: msg } = AntdApp.useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    const created = createDataset({ name, description });
    void msg.success(`Dataset ${created.name} created`);
    navigate(`datasets/${created.id}`);
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
      </Panel>
      <Button tone='primary' onClick={submit}>
        Create
      </Button>
    </div>
  );
}
