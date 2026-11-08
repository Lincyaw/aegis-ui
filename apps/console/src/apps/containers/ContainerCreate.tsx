import type { ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FormRow, PageHeader, Panel } from '@lincyaw/aegis-ui';
import { Button, Form, Input, InputNumber, Select } from 'antd';

import type { ContainerStatus } from './data';
import { useContainers } from './store';

interface FormShape {
  name: string;
  image: string;
  status: ContainerStatus;
  cpu: number;
  memMb: number;
}

export function ContainerCreate(): ReactElement {
  const { addContainer } = useContainers();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormShape>();

  const onFinish = (values: FormShape): void => {
    const id = addContainer({
      name: values.name,
      image: values.image,
      status: values.status,
      cpu: values.cpu,
      memMb: values.memMb,
    });
    navigate(`../${id}`);
  };

  return (
    <>
      <PageHeader
        title='New container'
        description='Register a demo workload. Validation and submit are local only.'
        action={<Link to='..'>← Cancel</Link>}
      />
      <Panel>
        <Form<FormShape>
          form={form}
          layout='vertical'
          onFinish={onFinish}
          initialValues={{ status: 'running', cpu: 0.2, memMb: 256 }}
          className='containers-form'
        >
          <FormRow
            label='Name'
            description='Unique workload identifier.'
            controlId='container-create-name'
          >
            <Form.Item
              name='name'
              rules={[
                { required: true, message: 'Required' },
                {
                  pattern: /^[a-z0-9-]{3,40}$/,
                  message: '3-40 chars, lowercase / digits / dash only',
                },
              ]}
              noStyle
            >
              <Input
                id='container-create-name'
                aria-describedby='container-create-name-description'
                placeholder='my-workload'
              />
            </Form.Item>
          </FormRow>

          <FormRow
            label='Image'
            description='OCI image reference.'
            controlId='container-create-image'
          >
            <Form.Item
              name='image'
              rules={[{ required: true, message: 'Required' }]}
              noStyle
            >
              <Input
                id='container-create-image'
                aria-describedby='container-create-image-description'
                placeholder='opspai/example:1.0.0'
              />
            </Form.Item>
          </FormRow>

          <FormRow label='Initial status' controlId='container-create-status'>
            <Form.Item name='status' noStyle>
              <Select
                id='container-create-status'
                options={[
                  { value: 'running', label: 'Running' },
                  { value: 'stopped', label: 'Stopped' },
                  { value: 'failed', label: 'Failed' },
                ]}
                className='containers-form__select'
              />
            </Form.Item>
          </FormRow>

          <FormRow
            label='CPU request'
            description='Cores (0–4).'
            controlId='container-create-cpu'
          >
            <Form.Item name='cpu' noStyle>
              <InputNumber
                id='container-create-cpu'
                aria-describedby='container-create-cpu-description'
                min={0}
                max={4}
                step={0.1}
              />
            </Form.Item>
          </FormRow>

          <FormRow
            label='Memory request'
            description='Megabytes (0–4096).'
            controlId='container-create-memory'
          >
            <Form.Item name='memMb' noStyle>
              <InputNumber
                id='container-create-memory'
                aria-describedby='container-create-memory-description'
                min={0}
                max={4096}
                step={64}
              />
            </Form.Item>
          </FormRow>

          <div className='containers-form__actions'>
            <Button type='primary' htmlType='submit'>
              Create
            </Button>
          </div>
        </Form>
      </Panel>
    </>
  );
}
