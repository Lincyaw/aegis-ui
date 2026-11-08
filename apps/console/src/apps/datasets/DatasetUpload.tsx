import { type ReactElement, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  EmptyState,
  FormRow,
  PageHeader,
  Panel,
  UploadQueue,
  type UploadQueueItem,
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
  const queue = useMemo(
    () =>
      uploads.map(
        (u): UploadQueueItem => ({
          id: u.id,
          file: u.file,
          status: u.done ? 'done' : 'uploading',
          progress: u.progress,
          bytesUploaded: Math.round(u.progress * u.file.size),
        })
      ),
    [uploads]
  );

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
          <FormRow label='Filename' controlId='dataset-upload-filename'>
            <Form.Item
              name='filename'
              rules={[{ required: true, message: 'Required' }]}
              noStyle
            >
              <Input
                id='dataset-upload-filename'
                placeholder='my-dataset.parquet'
              />
            </Form.Item>
          </FormRow>
          <FormRow label='Format' controlId='dataset-upload-format'>
            <Form.Item name='format' noStyle>
              <Select
                id='dataset-upload-format'
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
        {queue.length === 0 ? (
          <EmptyState title='No uploads yet' />
        ) : (
          <UploadQueue items={queue} />
        )}
      </Panel>
    </>
  );
}
