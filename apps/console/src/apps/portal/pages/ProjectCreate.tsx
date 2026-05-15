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

export default function ProjectCreate() {
  const navigate = useAppNavigate();
  const createProject = useMockStore((s) => s.createProject);
  const { message: msg } = AntdApp.useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    const created = createProject({ name, description });
    void msg.success(`Project ${created.name} created`);
    navigate(`projects/${created.id}/overview`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New Project'
        description='Create a new fault-injection project.'
        action={
          <Button tone='secondary' onClick={() => navigate('projects')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name'>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='checkout-service'
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
