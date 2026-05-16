import { type ReactElement, useCallback, useEffect, useState } from 'react';

import {
  Button,
  Chip,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SettingsSection,
  TextField,
} from '@lincyaw/aegis-ui';

import { type BucketSummary, listBuckets } from '../../../api/blobClient';
import {
  clearBackendUrl,
  clearBlobRoot,
  fetchHealth,
  getBackendUrl,
  getBlobRoot,
  type HealthInfo,
  setBackendUrl,
  setBlobRoot,
} from '../connection';
import { type BlobProbeInfo, probeBlobRoot } from '../repo';

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'ok'; info: HealthInfo }
  | { kind: 'error'; message: string };

const PLACEHOLDER = 'http://host:8765';

type BlobProbeState =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'ok'; info: BlobProbeInfo }
  | { kind: 'error'; message: string };

export function SettingsPage(): ReactElement {
  const [draft, setDraft] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });
  const [blobBucket, setBlobBucket] = useState<string>('');
  const [blobPrefix, setBlobPrefix] = useState<string>('');
  const [savedBlob, setSavedBlob] = useState<{
    bucket: string;
    prefix: string;
  } | null>(null);
  const [blobProbe, setBlobProbe] = useState<BlobProbeState>({ kind: 'idle' });
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);

  useEffect(() => {
    const current = getBackendUrl();
    setSaved(current);
    setDraft(current ?? '');
    if (current) {
      void probeUrl(current);
    }
    const blob = getBlobRoot();
    if (blob) {
      setSavedBlob({ bucket: blob.bucket, prefix: blob.prefix });
      setBlobBucket(blob.bucket);
      setBlobPrefix(blob.prefix);
      void probeBlob(blob.bucket, blob.prefix);
    }
    listBuckets()
      .then(setBuckets)
      .catch(() => {
        // Buckets are a hint only — silent failure is fine.
      });
    // probeUrl identity is stable below; this effect only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const probeUrl = useCallback(async (url: string): Promise<void> => {
    setProbe({ kind: 'probing' });
    try {
      const info = await fetchHealth(url);
      setProbe({ kind: 'ok', info });
    } catch (err) {
      setProbe({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    setBackendUrl(trimmed);
    setSaved(trimmed);
    await probeUrl(trimmed);
  }, [draft, probeUrl]);

  const handleTest = useCallback(async (): Promise<void> => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    await probeUrl(trimmed);
  }, [draft, probeUrl]);

  const handleForget = useCallback((): void => {
    clearBackendUrl();
    setSaved(null);
    setDraft('');
    setProbe({ kind: 'idle' });
  }, []);

  const probeBlob = useCallback(
    async (bucket: string, prefix: string): Promise<void> => {
      setBlobProbe({ kind: 'probing' });
      try {
        const info = await probeBlobRoot({ bucket, prefix });
        setBlobProbe({ kind: 'ok', info });
      } catch (err) {
        setBlobProbe({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    []
  );

  const handleBlobSave = useCallback(async (): Promise<void> => {
    const bucket = blobBucket.trim();
    if (!bucket) {
      return;
    }
    setBlobRoot({ bucket, prefix: blobPrefix });
    const stored = getBlobRoot();
    if (stored) {
      setSavedBlob({ bucket: stored.bucket, prefix: stored.prefix });
      setBlobPrefix(stored.prefix);
      await probeBlob(stored.bucket, stored.prefix);
    }
  }, [blobBucket, blobPrefix, probeBlob]);

  const handleBlobTest = useCallback(async (): Promise<void> => {
    const bucket = blobBucket.trim();
    if (!bucket) {
      return;
    }
    await probeBlob(bucket, blobPrefix);
  }, [blobBucket, blobPrefix, probeBlob]);

  const handleBlobForget = useCallback((): void => {
    clearBlobRoot();
    setSavedBlob(null);
    setBlobBucket('');
    setBlobPrefix('');
    setBlobProbe({ kind: 'idle' });
  }, []);

  const statusChip = (() => {
    switch (probe.kind) {
      case 'idle':
        return <Chip tone='default'>not connected</Chip>;
      case 'probing':
        return <Chip tone='default'>checking…</Chip>;
      case 'ok':
        return <Chip tone='ink'>connected</Chip>;
      case 'error':
        return <Chip tone='warning'>unreachable</Chip>;
    }
  })();

  const dirty = draft.trim() !== (saved ?? '');

  const blobStatusChip = (() => {
    switch (blobProbe.kind) {
      case 'idle':
        return <Chip tone='default'>not connected</Chip>;
      case 'probing':
        return <Chip tone='default'>checking…</Chip>;
      case 'ok':
        return <Chip tone='ink'>connected</Chip>;
      case 'error':
        return <Chip tone='warning'>unreachable</Chip>;
    }
  })();

  const blobDirty =
    blobBucket.trim() !== (savedBlob?.bucket ?? '') ||
    blobPrefix.trim() !== (savedBlob?.prefix ?? '');

  return (
    <Panel
      title={<PanelTitle size='lg'>Connection</PanelTitle>}
      extra={<MetricLabel>llmharness · backend</MetricLabel>}
    >
      <SettingsSection
        title='Backend URL'
        description='Point this at any `llmharness serve` instance. The sub-app talks to it directly — no shell proxy involved.'
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextField
              label='URL'
              placeholder={PLACEHOLDER}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              autoComplete='off'
            />
          </div>
          <Button
            tone='ghost'
            onClick={() => void handleTest()}
            disabled={!draft.trim()}
          >
            Test
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!draft.trim() || !dirty}
          >
            Save
          </Button>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {statusChip}
          {probe.kind === 'ok' && (
            <MetricLabel size='xs'>
              {probe.info.caseCount} cases · v{probe.info.version}
            </MetricLabel>
          )}
          {probe.kind === 'error' && (
            <MetricLabel size='xs'>{probe.message}</MetricLabel>
          )}
        </div>
        {probe.kind === 'ok' && (
          <div style={{ marginTop: 16 }}>
            <KeyValueList
              items={[
                {
                  k: 'root',
                  v: <MonoValue size='sm'>{probe.info.root}</MonoValue>,
                },
                {
                  k: 'cases',
                  v: (
                    <MonoValue size='sm'>
                      {String(probe.info.caseCount)}
                    </MonoValue>
                  ),
                },
                {
                  k: 'version',
                  v: <MonoValue size='sm'>{probe.info.version}</MonoValue>,
                },
              ]}
            />
          </div>
        )}
      </SettingsSection>
      <SettingsSection
        title='Blob source'
        description='Point at a path inside platform blob storage (aegis-blob). The viewer enumerates case directories under this prefix and reads files directly — no external llmharness backend needed.'
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <TextField
              label='Bucket'
              placeholder='my-bucket'
              value={blobBucket}
              onChange={(e) => setBlobBucket(e.target.value)}
              spellCheck={false}
              autoComplete='off'
            />
          </div>
          <div style={{ flex: 2, minWidth: 240 }}>
            <TextField
              label='Prefix'
              placeholder='runs/2024-05-15/cases/'
              value={blobPrefix}
              onChange={(e) => setBlobPrefix(e.target.value)}
              spellCheck={false}
              autoComplete='off'
            />
          </div>
          <Button
            tone='ghost'
            onClick={() => void handleBlobTest()}
            disabled={!blobBucket.trim()}
          >
            Test
          </Button>
          <Button
            onClick={() => void handleBlobSave()}
            disabled={!blobBucket.trim() || !blobDirty}
          >
            Save
          </Button>
        </div>
        {buckets.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <MetricLabel size='xs'>buckets</MetricLabel>
            {buckets.map((b) => (
              <Chip
                key={b.name}
                tone={blobBucket === b.name ? 'ink' : 'default'}
                onClick={() => setBlobBucket(b.name)}
              >
                {b.name}
              </Chip>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {blobStatusChip}
          {blobProbe.kind === 'ok' && (
            <MetricLabel size='xs'>
              {blobProbe.info.caseCount} sub-directories at this prefix
            </MetricLabel>
          )}
          {blobProbe.kind === 'error' && (
            <MetricLabel size='xs'>{blobProbe.message}</MetricLabel>
          )}
        </div>
        {blobProbe.kind === 'ok' && (
          <div style={{ marginTop: 16 }}>
            <KeyValueList
              items={[
                {
                  k: 'bucket',
                  v: <MonoValue size='sm'>{blobProbe.info.bucket}</MonoValue>,
                },
                {
                  k: 'prefix',
                  v: (
                    <MonoValue size='sm'>
                      {blobProbe.info.prefix || '(bucket root)'}
                    </MonoValue>
                  ),
                },
                {
                  k: 'sub-dirs',
                  v: (
                    <MonoValue size='sm'>
                      {String(blobProbe.info.caseCount)}
                    </MonoValue>
                  ),
                },
              ]}
            />
          </div>
        )}
        {savedBlob && (
          <div style={{ marginTop: 16 }}>
            <Button tone='ghost' onClick={handleBlobForget}>
              Forget blob source
            </Button>
          </div>
        )}
      </SettingsSection>
      {saved && (
        <SettingsSection
          title='Reset'
          description='Forget the saved URL. The Cases tab will fall back to the blob source or a local directory.'
        >
          <Button tone='ghost' onClick={handleForget}>
            Forget backend
          </Button>
        </SettingsSection>
      )}
    </Panel>
  );
}

export default SettingsPage;
