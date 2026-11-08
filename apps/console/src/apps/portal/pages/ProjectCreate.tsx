import { useState } from 'react';

import {
  Button,
  Checkbox,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useCreateProject } from '../api/projects';
import { useActiveProjectStore } from '../state/active-project';

export default function ProjectCreate() {
  const navigate = useAppNavigate();
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject);
  const { message: msg } = AntdApp.useApp();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const submit = (): void => {
    if (!name.trim()) {
      setNameError('Name is required');
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
          void msg.error(`Failed to create project: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
      <PageHeader
        title='New project'
        description='Create a new fault-injection project.'
        action={
          <Button tone='secondary' onClick={() => navigate('projects')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name' controlId='project-create-name'>
          <TextField
            id='project-create-name'
            value={name}
            error={nameError}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(undefined);
            }}
            placeholder='checkout-service'
          />
        </FormRow>
        <FormRow label='Description' controlId='project-create-description'>
          <TextField
            id='project-create-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional description'
          />
        </FormRow>
        <FormRow label='Visibility'>
          <Checkbox label='Public' checked={isPublic} onChange={setIsPublic} />
        </FormRow>
      </Panel>
      <div className='wizard-actions'>
        <Button
          tone='primary'
          onClick={submit}
          disabled={createProject.isPending}
        >
          {createProject.isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </>
  );
}
