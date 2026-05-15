import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { App as AntdApp, Button } from 'antd';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  useActiveApp,
} from '@lincyaw/aegis-ui';

import {
  forgetShare,
  pruneExpiredShares,
  readShares,
  type ShareRecord,
} from '../../../api/blobClient';

function lastSegment(key: string): string {
  const idx = key.lastIndexOf('/');
  return idx === -1 ? key : key.slice(idx + 1);
}

function remaining(expiresAt: string, nowMs: number): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) {
    return 'expired';
  }
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return `${h.toString()}h ${m.toString()}m`;
  }
  if (m > 0) {
    return `${m.toString()}m`;
  }
  return `${s.toString()}s`;
}

export default function SharesPage() {
  const { message: msg } = AntdApp.useApp();
  const { basePath } = useActiveApp();
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    pruneExpiredShares();
    setShares(readShares());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const copy = useCallback(
    async (url: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(url);
        void msg.success('Copied');
      } catch {
        void msg.error('Clipboard unavailable');
      }
    },
    [msg],
  );

  const revoke = useCallback(
    (id: string): void => {
      forgetShare(id);
      setShares(readShares());
      void msg.info(
        'Removed from your registry (link itself stays valid until TTL).',
      );
    },
    [msg],
  );

  const columns = useMemo<Array<DataTableColumn<ShareRecord>>>(
    () => [
      {
        key: 'object',
        header: 'Object',
        render: (row) => (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-px)' }}>
            <MonoValue size="sm">{lastSegment(row.key)}</MonoValue>
            <Link
              to={`${basePath}/${encodeURIComponent(row.bucket)}`}
              style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-11)' }}
            >
              {row.bucket}/{row.key}
            </Link>
          </span>
        ),
      },
      {
        key: 'kind',
        header: 'Mode',
        width: 120,
        render: (row) => (
          <Chip tone="ghost">{row.asAttachment ? 'download' : 'inline'}</Chip>
        ),
      },
      {
        key: 'expires',
        header: 'Expires in',
        width: 140,
        render: (row) => {
          const left = remaining(row.expiresAt, now);
          return (
            <Chip tone={left === 'expired' ? 'warning' : 'ghost'}>{left}</Chip>
          );
        },
      },
      {
        key: 'created',
        header: 'Created',
        width: 180,
        render: (row) => (
          <MonoValue size="sm">{new Date(row.createdAt).toLocaleString()}</MonoValue>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        truncate: false,
        width: 140,
        render: (row) => (
          <span style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              type="text"
              icon={<CopyOutlined />}
              onClick={() => {
                void copy(row.url);
              }}
              title="Copy link"
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                revoke(row.id);
              }}
              title="Forget"
            />
          </span>
        ),
      },
    ],
    [basePath, copy, now, revoke],
  );

  return (
    <>
      <PageHeader
        title="My shares"
        description="Presigned links you've generated from this browser. Stored locally — clearing browser data drops the list, but live URLs keep working until they expire."
      />

      <Panel>
        <MetricLabel>
          Local browser history — not synced. Links keep working until their TTL expires; revoke only removes the row here.
        </MetricLabel>
      </Panel>

      {shares.length === 0 ? (
        <Panel>
          <EmptyState
            title="No share links yet"
            description="Generate a share link from any object's preview action and it will land here."
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <DataTable
            columns={columns}
            data={shares}
            rowKey={(row) => row.id}
          />
        </Panel>
      )}
    </>
  );
}
