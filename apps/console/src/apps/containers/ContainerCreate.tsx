import type { ReactElement } from 'react';

import { FormRow, PageHeader, Panel } from '@OperationsPAI/aegis-ui';
import { Button, Form, Input, InputNumber, Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

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
        title="New container"
        description="Register a demo workload. Validation and submit are local only."
        action={<Link to="..">← Cancel</Link>}
      />
      <Panel>
        <Form<FormShape>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: 'running', cpu: 0.2, memMb: 256 }}
          style={{ padding: 'var(--space-4)' }}
        >
          <FormRow label="Name" description="Unique workload identifier.">
            <Form.Item
              name="name"
              rules={[
                { required: true, message: 'Required' },
                {
                  pattern: /^[a-z0-9-]{3,40}$/,
                  message: '3-40 chars, lowercase / digits / dash only',
                },
              ]}
              noStyle
            >
              <Input placeholder="my-workload" />
            </Form.Item>
          </FormRow>

          <FormRow label="Image" description="OCI image reference.">
            <Form.Item
              name="image"
              rules={[{ required: true, message: 'Required' }]}
              noStyle
            >
              <Input placeholder="opspai/example:1.0.0" />
            </Form.Item>
          </FormRow>

          <FormRow label="Initial status">
            <Form.Item name="status" noStyle>
              <Select
                options={[
                  { value: 'running', label: 'Running' },
                  { value: 'stopped', label: 'Stopped' },
                  { value: 'failed', label: 'Failed' },
                ]}
                style={{ minWidth: 180 }}
              />
            </Form.Item>
          </FormRow>

          <FormRow label="CPU request" description="Cores (0–4).">
            <Form.Item name="cpu" noStyle>
              <InputNumber min={0} max={4} step={0.1} />
            </Form.Item>
          </FormRow>

          <FormRow label="Memory request" description="Megabytes (0–4096).">
            <Form.Item name="memMb" noStyle>
              <InputNumber min={0} max={4096} step={64} />
            </Form.Item>
          </FormRow>

          <div style={{ paddingTop: 'var(--space-4)' }}>
            <Button type="primary" htmlType="submit">
              Create
            </Button>
          </div>
        </Form>
      </Panel>
    </>
  );
}
