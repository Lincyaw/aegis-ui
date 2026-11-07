import { useMemo, useState } from 'react';

import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SearchInput,
  Toolbar,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp, Button, Input, Modal, Select } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { createBucket, listBuckets } from '../../../api/blobClient';
import '../blob-app.css';
import { BucketCard } from '../components/BucketCard';
import { blobKeys } from '../queryKeys';

const DRIVERS = ['localfs', 's3'] as const;
type Driver = (typeof DRIVERS)[number];

type SortKey = 'name-asc' | 'name-desc';

export default function BucketsOverview() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDriver, setNewDriver] = useState<Driver>('localfs');
  const { basePath } = useActiveApp();
  const { message: msg } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const buckets = useQuery({
    queryKey: blobKeys.buckets,
    queryFn: listBuckets,
  });

  const create = useMutation({
    mutationFn: createBucket,
    onSuccess: async (_data, req) => {
      void msg.success(`Bucket "${req.name}" created`);
      closeCreate();
      await queryClient.invalidateQueries({ queryKey: blobKeys.buckets });
    },
  });

  const filtered = useMemo(() => {
    let out = buckets.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((b) => b.name.toLowerCase().includes(q));
    }
    return [...out].sort((a, b) =>
      sort === 'name-asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [buckets.data, search, sort]);

  function closeCreate(): void {
    setCreateOpen(false);
    setNewName('');
    setNewDriver('localfs');
    create.reset();
  }

  function submitCreate(): void {
    const name = newName.trim();
    if (!name) {
      return;
    }
    create.mutate({ name, driver: newDriver });
  }

  return (
    <>
      <PageHeader
        title='Files'
        description='Browse, upload, and share objects across aegis-blob buckets.'
      />

      <Toolbar
        left={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder='Search buckets…'
            onClear={() => {
              setSearch('');
            }}
          />
        }
        center={
          <Select<SortKey>
            value={sort}
            onChange={setSort}
            size='small'
            options={[
              { value: 'name-asc', label: 'Name A→Z' },
              { value: 'name-desc', label: 'Name Z→A' },
            ]}
            className='blob-sort'
          />
        }
        right={
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            New bucket
          </Button>
        }
      />

      {buckets.isError ? (
        <Panel>
          <ErrorState
            title='Could not list buckets'
            description={errMsg(buckets.error)}
            action={
              <Button
                onClick={() => {
                  void buckets.refetch();
                }}
              >
                Retry
              </Button>
            }
          />
        </Panel>
      ) : null}

      {buckets.isSuccess && filtered.length === 0 ? (
        <Panel>
          <EmptyState
            title={search ? 'No matching buckets' : 'No buckets configured'}
            description={
              search
                ? 'Try a different search term.'
                : 'Ask an admin to provision an aegis-blob bucket.'
            }
          />
        </Panel>
      ) : null}

      {filtered.length > 0 ? (
        <div className='blob-overview__grid'>
          {filtered.map((b) => (
            <BucketCard
              key={b.name}
              bucket={b}
              to={`${basePath}/${encodeURIComponent(b.name)}`}
            />
          ))}
        </div>
      ) : null}

      <Modal
        title='New bucket'
        open={createOpen}
        onCancel={closeCreate}
        onOk={submitCreate}
        okText='Create'
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <div className='blob-form'>
          <label className='blob-field'>
            <span className='blob-field__label'>Bucket name</span>
            <Input
              placeholder='my-bucket'
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
              }}
              onPressEnter={submitCreate}
            />
          </label>
          <label className='blob-field'>
            <span className='blob-field__label'>Driver</span>
            <Select<Driver>
              value={newDriver}
              onChange={setNewDriver}
              className='blob-field__control'
              options={DRIVERS.map((d) => ({ value: d, label: d }))}
            />
          </label>
          {create.isError ? (
            <Alert tone='error'>{errMsg(create.error)}</Alert>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
