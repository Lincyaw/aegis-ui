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
import { ContainerType } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useCreateContainer } from '../api/containers';

interface FieldErrors {
  name?: string;
  versionName?: string;
  imageRef?: string;
}

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
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (): void => {
    const next: FieldErrors = {
      name: name.trim() ? undefined : 'Name is required',
      versionName: versionName.trim() ? undefined : 'Version name is required',
      imageRef: imageRef.trim() ? undefined : 'Image ref is required',
    };
    if (next.name || next.versionName || next.imageRef) {
      setErrors(next);
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
          void msg.error(`Register failed: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
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
        <FormRow label='Name' controlId='container-create-name'>
          <TextField
            id='container-create-name'
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({ ...errors, name: undefined });
            }}
          />
        </FormRow>
        <FormRow label='Visibility'>
          <Checkbox label='Public' checked={isPublic} onChange={setIsPublic} />
        </FormRow>
        <FormRow label='Version name' controlId='container-create-version-name'>
          <TextField
            id='container-create-version-name'
            value={versionName}
            error={errors.versionName}
            onChange={(e) => {
              setVersionName(e.target.value);
              setErrors({ ...errors, versionName: undefined });
            }}
            placeholder='v1'
          />
        </FormRow>
        <FormRow label='Image ref' controlId='container-create-image-ref'>
          <TextField
            id='container-create-image-ref'
            value={imageRef}
            error={errors.imageRef}
            onChange={(e) => {
              setImageRef(e.target.value);
              setErrors({ ...errors, imageRef: undefined });
            }}
            placeholder={copy.imagePlaceholder}
          />
        </FormRow>
        <FormRow label='Readme' controlId='container-create-readme'>
          <TextField
            id='container-create-readme'
            value={readme}
            onChange={(e) => setReadme(e.target.value)}
            placeholder='Optional notes'
          />
        </FormRow>
      </Panel>
      <div className='wizard-actions'>
        <Button
          tone='primary'
          onClick={submit}
          disabled={createContainer.isPending}
        >
          {createContainer.isPending ? 'Registering…' : copy.submitLabel}
        </Button>
      </div>
    </>
  );
}
