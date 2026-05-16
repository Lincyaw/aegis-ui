import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { ContainerType } from '@lincyaw/portal';
import { App as AntdApp, Select } from 'antd';

import { useCreateContainer } from '../hooks/useContainers';

export default function ContainerCreate() {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const createContainer = useCreateContainer();

  const [name, setName] = useState('');
  const [type, setType] = useState<ContainerType>(ContainerType.Algorithm);
  const [isPublic, setIsPublic] = useState(false);
  const [readme, setReadme] = useState('');
  const [versionName, setVersionName] = useState('v1');
  const [imageRef, setImageRef] = useState('');

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    if (!imageRef.trim() || !versionName.trim()) {
      void msg.error('image and version name are required');
      return;
    }
    createContainer.mutate(
      {
        name: name.trim(),
        type,
        is_public: isPublic,
        readme: readme.trim() || undefined,
        version: {
          name: versionName.trim(),
          image_ref: imageRef.trim(),
        },
      },
      {
        onSuccess: (created) => {
          void msg.success(`Registered ${created?.name ?? name}`);
          if (created?.id !== undefined) {
            navigate(`containers/${String(created.id)}`);
          } else {
            navigate('containers');
          }
        },
        onError: (err) => {
          void msg.error(err instanceof Error ? err.message : 'Create failed');
        },
      }
    );
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Register container'
        description='Register a new container image + algorithm binding.'
        action={
          <Button tone='secondary' onClick={() => navigate('containers')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name'>
          <TextField value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <FormRow label='Type'>
          <Select
            value={type}
            onChange={setType}
            style={{ width: 240 }}
            options={[
              { value: ContainerType.Algorithm, label: 'Algorithm' },
              { value: ContainerType.Benchmark, label: 'Benchmark' },
              { value: ContainerType.Pedestal, label: 'Pedestal' },
            ]}
          />
        </FormRow>
        <FormRow label='Visibility'>
          <Select
            value={isPublic}
            onChange={setIsPublic}
            style={{ width: 240 }}
            options={[
              { value: false, label: 'Private' },
              { value: true, label: 'Public' },
            ]}
          />
        </FormRow>
        <FormRow label='Version name'>
          <TextField
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder='v1'
          />
        </FormRow>
        <FormRow label='Image ref'>
          <TextField
            value={imageRef}
            onChange={(e) => setImageRef(e.target.value)}
            placeholder='opspai/rcabench-algo:r1'
          />
        </FormRow>
        <FormRow label='Readme'>
          <TextField
            value={readme}
            onChange={(e) => setReadme(e.target.value)}
            placeholder='Optional notes'
          />
        </FormRow>
      </Panel>
      <Button
        tone='primary'
        onClick={submit}
        disabled={createContainer.isPending}
      >
        {createContainer.isPending ? 'Registering…' : 'Register'}
      </Button>
    </div>
  );
}
