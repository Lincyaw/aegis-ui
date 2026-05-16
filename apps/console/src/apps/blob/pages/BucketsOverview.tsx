import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PlusOutlined } from '@ant-design/icons';
import {
  BucketCard,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SearchInput,
  Toolbar,
  useActiveApp,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Button, Input, Modal, Select } from 'antd';

import { ApiError } from '../../../api/apiClient';
import {
  type BucketSummary,
  createBucket,
  listBuckets,
} from '../../../api/blobClient';

const DRIVERS = ['localfs', 's3'] as const;
type Driver = (typeof DRIVERS)[number];

type SortKey = 'name-asc' | 'name-desc';

function errMsg(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

export default function BucketsOverview() {
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDriver, setNewDriver] = useState<Driver>('localfs');
  const navigate = useNavigate();
  const { basePath } = useActiveApp();
  const { message: msg } = AntdApp.useApp();

  useEffect(() => {
    const cancelled = { value: false };
    setLoading(true);
    void (async () => {
      try {
        const items = await listBuckets();
        if (!cancelled.value) {
          setBuckets(items);
        }
      } catch (e) {
        if (!cancelled.value) {
          setError(errMsg(e));
        }
      } finally {
        if (!cancelled.value) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled.value = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let out = buckets;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((b) => b.name.toLowerCase().includes(q));
    }
    out = [...out].sort((a, b) => {
      if (sort === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });
    return out;
  }, [buckets, search, sort]);

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createBucket({ name, driver: newDriver });
      void msg.success(`Bucket "${name}" created`);
      setCreateOpen(false);
      setNewName('');
      setNewDriver('localfs');
      const items = await listBuckets();
      setBuckets(items);
    } catch (e) {
      setCreateError(errMsg(e));
    } finally {
      setCreateLoading(false);
    }
  };

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
            style={{ minWidth: 'calc(var(--space-12) * 2.5)' }}
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

      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not list buckets'
            description={error}
            action={
              <Button
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload
              </Button>
            }
          />
        </Panel>
      ) : null}

      {!error && !loading && filtered.length === 0 ? (
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

      {!error && filtered.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {filtered.map((b) => (
            <BucketCard
              key={b.name}
              name={b.name}
              driver={b.driver}
              maxObjectBytes={b.max_object_bytes}
              retentionDays={b.retention_days}
              publicRead={b.public_read}
              onClick={() => {
                navigate(`${basePath}/${encodeURIComponent(b.name)}`);
              }}
            />
          ))}
        </div>
      ) : null}

      <Modal
        title='New bucket'
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setNewName('');
          setNewDriver('localfs');
          setCreateError(null);
        }}
        onOk={() => {
          void handleCreate();
        }}
        okText='Create'
        confirmLoading={createLoading}
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                color: 'var(--text-muted)',
              }}
            >
              Bucket name
            </label>
            <Input
              placeholder='my-bucket'
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
              }}
              onPressEnter={() => {
                void handleCreate();
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                color: 'var(--text-muted)',
              }}
            >
              Driver
            </label>
            <Select<Driver>
              value={newDriver}
              onChange={setNewDriver}
              style={{ width: '100%' }}
              options={DRIVERS.map((d) => ({ value: d, label: d }))}
            />
          </div>
          {createError !== null ? (
            <div style={{ color: 'var(--accent-warning)' }}>{createError}</div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
