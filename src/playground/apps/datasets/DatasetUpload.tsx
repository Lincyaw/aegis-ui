import type { ReactElement } from 'react';

import { Button, Form, Input, Select } from 'antd';
import { Link } from 'react-router-dom';

import { Chip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FormRow } from '../../../components/ui/FormRow';
import { MonoValue } from '../../../components/ui/MonoValue';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';
import { StatusDot } from '../../../components/ui/StatusDot';
import type { DemoDataset } from './data';
import { useDatasets } from './store';

interface UploadFormShape {
  filename: string;
  format: DemoDataset['format'];
}

export function DatasetUpload(): ReactElement {
  const { startUpload, uploads } = useDatasets();
  const [form] = Form.useForm<UploadFormShape>();

  const onFinish = (values: UploadFormShape): void => {
    startUpload(values.filename, values.format);
    form.resetFields(['filename']);
  };

  return (
    <>
      <PageHeader
        title="Upload dataset"
        description="Simulated upload — progresses to 100% over ~2 seconds, then registers."
        action={<Link to="..">← Browse</Link>}
      />

      <Panel title="New upload">
        <Form<UploadFormShape>
          form={form}
          layout="vertical"
          initialValues={{ format: 'parquet' }}
          onFinish={onFinish}
          style={{ padding: 'var(--space-4)' }}
        >
          <FormRow label="Filename">
            <Form.Item
              name="filename"
              rules={[{ required: true, message: 'Required' }]}
              noStyle
            >
              <Input placeholder="my-dataset.parquet" />
            </Form.Item>
          </FormRow>
          <FormRow label="Format">
            <Form.Item name="format" noStyle>
              <Select
                style={{ minWidth: 180 }}
                options={[
                  { value: 'parquet', label: 'Parquet' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'jsonl', label: 'JSONL' },
                ]}
              />
            </Form.Item>
          </FormRow>
          <div style={{ paddingTop: 'var(--space-4)' }}>
            <Button type="primary" htmlType="submit">
              Start upload
            </Button>
          </div>
        </Form>
      </Panel>

      <Panel title="Upload queue">
        {uploads.length === 0 ? (
          <EmptyState title="No uploads yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {uploads.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderTop: '1px solid var(--border-hairline)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <StatusDot
                      tone={u.done ? 'ink' : 'muted'}
                      pulse={!u.done}
                    />
                    <MonoValue size="sm">{u.filename}</MonoValue>
                    <Chip tone="ghost">{u.format}</Chip>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: 'var(--bg-muted)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${u.progress}%`,
                        height: '100%',
                        background: 'var(--bg-inverted)',
                        transition: 'width 0.22s ease',
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-12)',
                    color: u.done ? 'var(--text-main)' : 'var(--text-muted)',
                  }}
                >
                  {u.done ? 'done' : `${Math.floor(u.progress)}%`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
