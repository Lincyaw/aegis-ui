import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Button } from 'antd';

import {
  BucketCard,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  useActiveApp,
} from '@lincyaw/aegis-ui';

import { ApiError } from '../../../api/apiClient';
import { type BucketSummary, listBuckets } from '../../../api/blobClient';

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
  const navigate = useNavigate();
  const { basePath } = useActiveApp();

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

  return (
    <>
      <PageHeader
        title="Files"
        description="Browse, upload, and share objects across aegis-blob buckets."
      />

      {error !== null ? (
        <Panel>
          <ErrorState
            title="Could not list buckets"
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

      {!error && !loading && buckets.length === 0 ? (
        <Panel>
          <EmptyState
            title="No buckets configured"
            description="Ask an admin to provision an aegis-blob bucket."
          />
        </Panel>
      ) : null}

      {!error && buckets.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {buckets.map((b) => (
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
    </>
  );
}
