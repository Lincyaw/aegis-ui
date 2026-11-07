import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  FormRow,
  MonoValue,
  PageHeader,
  Panel,
  StatusDot,
} from '@lincyaw/aegis-ui';
import { Button, Form, Input, Select } from 'antd';

import type { DemoDataset } from './data';
import { DatasetsBreadcrumb } from './DatasetsBreadcrumb';
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
      <DatasetsBreadcrumb current='Upload' />
      <PageHeader
        title='Upload dataset'
        description='Simulated upload — progresses to 100% over ~2 seconds, then registers.'
        action={<Link to='..'>← Browse</Link>}
      />

      <Panel title='New upload'>
        <Form<UploadFormShape>
          form={form}
          layout='vertical'
          initialValues={{ format: 'parquet' }}
          onFinish={onFinish}
          className='datasets-form'
        >
          <FormRow label='Filename'>
            <Form.Item
              name='filename'
              rules={[{ required: true, message: 'Required' }]}
              noStyle
            >
              <Input placeholder='my-dataset.parquet' />
            </Form.Item>
          </FormRow>
          <FormRow label='Format'>
            <Form.Item name='format' noStyle>
              <Select
                className='datasets-form__select'
                options={[
                  { value: 'parquet', label: 'Parquet' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'jsonl', label: 'JSONL' },
                ]}
              />
            </Form.Item>
          </FormRow>
          <div className='datasets-form__actions'>
            <Button type='primary' htmlType='submit'>
              Start upload
            </Button>
          </div>
        </Form>
      </Panel>

      <Panel title='Upload queue'>
        {uploads.length === 0 ? (
          <EmptyState title='No uploads yet' />
        ) : (
          <div className='datasets-list'>
            {uploads.map((u) => (
              <div key={u.id} className='datasets-upload'>
                <div>
                  <div className='datasets-upload__head'>
                    <StatusDot
                      tone={u.done ? 'ink' : 'muted'}
                      pulse={!u.done}
                    />
                    <MonoValue size='sm'>{u.filename}</MonoValue>
                    <Chip tone='ghost'>{u.format}</Chip>
                  </div>
                  <div className='datasets-upload__bar'>
                    <div
                      className='datasets-upload__bar-fill'
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
                <div
                  className={
                    u.done
                      ? 'datasets-upload__progress datasets-upload__progress--done'
                      : 'datasets-upload__progress'
                  }
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
