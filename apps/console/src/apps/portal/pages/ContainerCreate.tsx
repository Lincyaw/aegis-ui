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

export default function ContainerCreate() {
  const navigate = useAppNavigate();
  const createContainer = useMockStore((s) => s.createContainer);
  const { message: msg } = AntdApp.useApp();

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [algorithm, setAlgorithm] = useState('');

  const submit = (): void => {
    if (!name.trim() || !image.trim()) {
      void msg.error('name and image are required');
      return;
    }
    const created = createContainer({ name, image, algorithm });
    void msg.success(`Registered ${created.name}`);
    navigate(`containers/${created.id}`);
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
        <FormRow label='Image'>
          <TextField
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder='opspai/rcabench-algo:r1'
          />
        </FormRow>
        <FormRow label='Algorithm'>
          <TextField
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            placeholder='microRCA'
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Register
      </Button>
    </div>
  );
}
