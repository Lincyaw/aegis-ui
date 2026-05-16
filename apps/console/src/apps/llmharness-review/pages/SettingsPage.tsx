import { CaretDownOutlined, FolderOutlined } from '@ant-design/icons';
import { type ReactElement, useCallback, useEffect, useState } from 'react';

import {
  Button,
  Chip,
  DropdownMenu,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SettingsSection,
  TextField,
} from '@lincyaw/aegis-ui';

import {
  type BucketSummary,
  driverList,
  listBuckets,
} from '../../../api/blobClient';
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

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'ok'; info: HealthInfo }
  | { kind: 'error'; message: string };

const PLACEHOLDER = 'http://host:8765';

type BrowseState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; subdirs: string[]; truncated: boolean }
  | { kind: 'error'; message: string };

export function SettingsPage(): ReactElement {
  const [draft, setDraft] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });

  // Blob settings — bucket is chosen from a dropdown, prefix is built by
  // drilling into the hierarchy. Manual typing not supported.
  const [blobBucket, setBlobBucket] = useState<string>('');
  const [blobPrefix, setBlobPrefix] = useState<string>('');
  const [savedBlob, setSavedBlob] = useState<{
    bucket: string;
    prefix: string;
  } | null>(null);
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [browse, setBrowse] = useState<BrowseState>({ kind: 'idle' });

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
    }
    listBuckets()
      .then(setBuckets)
      .catch(() => {
        // Buckets dropdown stays empty — surfaced via empty-state below.
      });
    // probeUrl identity is stable below; this effect only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the chosen (bucket, prefix) changes, refresh the sub-directory
  // listing that drives the path browser.
  useEffect(() => {
    if (!blobBucket) {
      setBrowse({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setBrowse({ kind: 'loading' });
    driverList(blobBucket, {
      prefix: blobPrefix,
      delimiter: '/',
      max_keys: 1000,
    })
      .then((page) => {
        if (cancelled) {
          return;
        }
        const subdirs = (page.common_prefixes ?? []).filter(
          (p) => p !== blobPrefix
        );
        setBrowse({
          kind: 'ok',
          subdirs,
          truncated: Boolean(page.is_truncated),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setBrowse({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [blobBucket, blobPrefix]);

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

  const handlePickBucket = useCallback((name: string): void => {
    setBlobBucket(name);
    setBlobPrefix('');
  }, []);

  const handleDrillInto = useCallback((subdir: string): void => {
    // common_prefixes already includes the trailing slash and is relative to
    // the bucket root, so we can use it directly as the next browse prefix.
    setBlobPrefix(subdir);
  }, []);

  const handleJumpToSegment = useCallback((nextPrefix: string): void => {
    setBlobPrefix(nextPrefix);
  }, []);

  const handleBlobSave = useCallback((): void => {
    const bucket = blobBucket.trim();
    if (!bucket) {
      return;
    }
    setBlobRoot({ bucket, prefix: blobPrefix });
    const stored = getBlobRoot();
    if (stored) {
      setSavedBlob({ bucket: stored.bucket, prefix: stored.prefix });
      setBlobPrefix(stored.prefix);
    }
  }, [blobBucket, blobPrefix]);

  const handleBlobForget = useCallback((): void => {
    clearBlobRoot();
    setSavedBlob(null);
    setBlobBucket('');
    setBlobPrefix('');
    setBrowse({ kind: 'idle' });
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
    if (!blobBucket) {
      return <Chip tone='default'>no bucket selected</Chip>;
    }
    switch (browse.kind) {
      case 'idle':
        return <Chip tone='default'>idle</Chip>;
      case 'loading':
        return <Chip tone='default'>browsing…</Chip>;
      case 'ok':
        return <Chip tone='ink'>connected</Chip>;
      case 'error':
        return <Chip tone='warning'>unreachable</Chip>;
    }
  })();

  const blobDirty =
    blobBucket.trim() !== (savedBlob?.bucket ?? '') ||
    blobPrefix.trim() !== (savedBlob?.prefix ?? '');

  // Breadcrumb segments derived from the current prefix.
  const segments = blobPrefix
    .split('/')
    .filter((s) => s.length > 0)
    .map((seg, idx, arr) => ({
      label: seg,
      target: `${arr.slice(0, idx + 1).join('/')}/`,
    }));

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
        description='Point at a path inside platform blob storage (aegis-blob). Pick a bucket, then drill into the directory tree — the viewer enumerates case directories under the chosen prefix.'
      >
        {/* Bucket picker */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <MetricLabel size='xs'>bucket</MetricLabel>
          <DropdownMenu
            align='left'
            trigger={
              <Button tone='ghost'>
                {blobBucket || 'Choose a bucket…'} <CaretDownOutlined />
              </Button>
            }
            items={
              buckets.length > 0
                ? buckets.map((b) => ({
                    key: b.name,
                    label: b.name,
                    onClick: () => handlePickBucket(b.name),
                  }))
                : [
                    {
                      key: 'empty',
                      label: 'No buckets available',
                      disabled: true,
                    },
                  ]
            }
          />
          {blobBucket && (
            <MetricLabel size='xs'>
              {browse.kind === 'ok'
                ? `${String(browse.subdirs.length)} sub-dir${
                    browse.subdirs.length === 1 ? '' : 's'
                  } here`
                : ''}
            </MetricLabel>
          )}
        </div>

        {/* Path breadcrumb + browser */}
        {blobBucket && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              <MetricLabel size='xs'>path</MetricLabel>
              <Chip
                tone={blobPrefix === '' ? 'ink' : 'default'}
                onClick={() => handleJumpToSegment('')}
              >
                {blobBucket}
              </Chip>
              {segments.map((seg, idx) => (
                <Chip
                  key={seg.target}
                  tone={idx === segments.length - 1 ? 'ink' : 'default'}
                  onClick={() => handleJumpToSegment(seg.target)}
                >
                  {seg.label}
                </Chip>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                minHeight: 32,
              }}
            >
              {browse.kind === 'loading' && (
                <MetricLabel size='xs'>browsing…</MetricLabel>
              )}
              {browse.kind === 'error' && (
                <MetricLabel size='xs'>{browse.message}</MetricLabel>
              )}
              {browse.kind === 'ok' && browse.subdirs.length === 0 && (
                <MetricLabel size='xs'>
                  no sub-directories here — saving this prefix will scan its
                  contents as cases
                </MetricLabel>
              )}
              {browse.kind === 'ok' &&
                browse.subdirs.map((sub) => {
                  // Display the leaf segment only.
                  const rel = sub.startsWith(blobPrefix)
                    ? sub.slice(blobPrefix.length)
                    : sub;
                  const label = rel.replace(/\/$/, '');
                  return (
                    <Chip
                      key={sub}
                      tone='default'
                      onClick={() => handleDrillInto(sub)}
                    >
                      <FolderOutlined style={{ marginRight: 4 }} />
                      {label}
                    </Chip>
                  );
                })}
              {browse.kind === 'ok' && browse.truncated && (
                <MetricLabel size='xs'>
                  …list truncated at 1000 entries
                </MetricLabel>
              )}
            </div>
          </div>
        )}

        {/* Save / status */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {blobStatusChip}
          <div style={{ flex: 1 }} />
          <Button onClick={handleBlobSave} disabled={!blobBucket || !blobDirty}>
            Save
          </Button>
        </div>

        {savedBlob && (
          <div style={{ marginTop: 16 }}>
            <KeyValueList
              items={[
                {
                  k: 'saved bucket',
                  v: <MonoValue size='sm'>{savedBlob.bucket}</MonoValue>,
                },
                {
                  k: 'saved prefix',
                  v: (
                    <MonoValue size='sm'>
                      {savedBlob.prefix || '(bucket root)'}
                    </MonoValue>
                  ),
                },
              ]}
            />
            <div style={{ marginTop: 12 }}>
              <Button tone='ghost' onClick={handleBlobForget}>
                Forget blob source
              </Button>
            </div>
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
