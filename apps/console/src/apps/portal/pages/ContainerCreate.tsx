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

interface Copy {
  basePath: string;
  noun: string;
  title: string;
  description: string;
  submitLabel: string;
  imagePlaceholder: string;
}

const COPY: Record<ContainerType, Copy> = {
  [ContainerType.Algorithm]: {
    basePath: 'algorithms',
    noun: 'algorithm',
    title: 'Register algorithm',
    description: 'Register a new RCA algorithm image.',
    submitLabel: 'Register',
    imagePlaceholder: 'opspai/rcabench-algo:r1',
  },
  [ContainerType.Benchmark]: {
    basePath: 'benchmarks',
    noun: 'benchmark',
    title: 'Register benchmark',
    description: 'Register a new benchmark datapack image.',
    submitLabel: 'Register',
    imagePlaceholder: 'opspai/rcabench-bench:r1',
  },
  [ContainerType.Pedestal]: {
    basePath: 'pedestal-charts',
    noun: 'pedestal chart',
    title: 'Register pedestal chart',
    description: 'Register a new pedestal helm chart.',
    submitLabel: 'Register',
    imagePlaceholder: 'opspai/rcabench-pedestal:r1',
  },
};

interface ContainerCreateProps {
  containerType: ContainerType;
}

export default function ContainerCreate({
  containerType,
}: ContainerCreateProps) {
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const createContainer = useCreateContainer();
  const copy = COPY[containerType];

  const [name, setName] = useState('');
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
        type: containerType,
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
            navigate(`${copy.basePath}/${String(created.id)}`);
          } else {
            navigate(copy.basePath);
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
        title={copy.title}
        description={copy.description}
        action={
          <Button tone='secondary' onClick={() => navigate(copy.basePath)}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name'>
          <TextField value={name} onChange={(e) => setName(e.target.value)} />
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
            placeholder={copy.imagePlaceholder}
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
        {createContainer.isPending ? 'Registering…' : copy.submitLabel}
      </Button>
    </div>
  );
}
