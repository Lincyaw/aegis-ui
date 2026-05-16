import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useActiveProjectStore } from '../hooks/useActiveProject';
import { useCreateProject } from '../hooks/useProjects';

export default function ProjectCreate() {
  const navigate = useAppNavigate();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const { message: msg } = AntdApp.useApp();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      },
      {
        onSuccess: (created) => {
          if (created.id !== undefined) {
            setActiveProject(created.id);
          }
          void msg.success(`Project ${created.name ?? name} created`);
          navigate('projects');
        },
        onError: (err) => {
          void msg.error(`Failed to create project: ${err.message}`);
        },
      }
    );
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
        <FormRow label='Visibility'>
          <label>
            <input
              type='checkbox'
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />{' '}
            Public
          </label>
        </FormRow>
      </Panel>
      <Button
        tone='primary'
        onClick={submit}
        disabled={createProject.isPending}
      >
        {createProject.isPending ? 'Creating…' : 'Create'}
      </Button>
    </div>
  );
}
