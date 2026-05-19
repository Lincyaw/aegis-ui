import { CaretDownOutlined, FolderOutlined } from '@ant-design/icons';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  clearBlobSftRoot,
  fetchHealth,
  getBackendUrl,
  getBlobRoot,
  getBlobSftRoot,
  type HealthInfo,
  setBackendUrl,
  setBlobRoot,
  setBlobSftRoot,
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

interface SavedBlob {
  bucket: string;
  prefix: string;
}

interface BlobPathPickerProps {
  buckets: BucketSummary[];
  saved: SavedBlob | null;
  onSave: (bucket: string, prefix: string) => void;
  onForget: () => void;
  saveLabel: string;
  forgetLabel: string;
  emptyHint: string;
}

function BlobPathPicker({
  buckets,
  saved,
  onSave,
  onForget,
  saveLabel,
  forgetLabel,
  emptyHint,
}: BlobPathPickerProps): ReactElement {
  const [bucket, setBucket] = useState<string>(saved?.bucket ?? '');
  const [prefix, setPrefix] = useState<string>(saved?.prefix ?? '');
  const [browse, setBrowse] = useState<BrowseState>({ kind: 'idle' });

  // Re-hydrate when the parent's saved value changes (e.g. on forget).
  useEffect(() => {
    setBucket(saved?.bucket ?? '');
    setPrefix(saved?.prefix ?? '');
  }, [saved?.bucket, saved?.prefix]);

  useEffect(() => {
    if (!bucket) {
      setBrowse({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setBrowse({ kind: 'loading' });
    driverList(bucket, {
      prefix,
      delimiter: '/',
      max_keys: 1000,
    })
      .then((page) => {
        if (cancelled) {
          return;
        }
        const subdirs = (page.common_prefixes ?? []).filter((p) => p !== prefix);
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
  }, [bucket, prefix]);

  const dirty =
    bucket.trim() !== (saved?.bucket ?? '') ||
    prefix.trim() !== (saved?.prefix ?? '');

  const statusChip = (() => {
    if (!bucket) {
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

  const segments = prefix
    .split('/')
    .filter((s) => s.length > 0)
    .map((seg, idx, arr) => ({
      label: seg,
      target: `${arr.slice(0, idx + 1).join('/')}/`,
    }));

  return (
    <>
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
              {bucket || 'Choose a bucket…'} <CaretDownOutlined />
            </Button>
          }
          items={
            buckets.length > 0
              ? buckets.map((b) => ({
                  key: b.name,
                  label: b.name,
                  onClick: () => {
                    setBucket(b.name);
                    setPrefix('');
                  },
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
        {bucket && (
          <MetricLabel size='xs'>
            {browse.kind === 'ok'
              ? `${String(browse.subdirs.length)} sub-dir${
                  browse.subdirs.length === 1 ? '' : 's'
                } here`
              : ''}
          </MetricLabel>
        )}
      </div>

      {bucket && (
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
              tone={prefix === '' ? 'ink' : 'default'}
              onClick={() => setPrefix('')}
            >
              {bucket}
            </Chip>
            {segments.map((seg, idx) => (
              <Chip
                key={seg.target}
                tone={idx === segments.length - 1 ? 'ink' : 'default'}
                onClick={() => setPrefix(seg.target)}
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
              <MetricLabel size='xs'>{emptyHint}</MetricLabel>
            )}
            {browse.kind === 'ok' &&
              browse.subdirs.map((sub) => {
                const rel = sub.startsWith(prefix) ? sub.slice(prefix.length) : sub;
                const label = rel.replace(/\/$/, '');
                return (
                  <Chip
                    key={sub}
                    tone='default'
                    onClick={() => setPrefix(sub)}
                  >
                    <FolderOutlined style={{ marginRight: 4 }} />
                    {label}
                  </Chip>
                );
              })}
            {browse.kind === 'ok' && browse.truncated && (
              <MetricLabel size='xs'>…list truncated at 1000 entries</MetricLabel>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {statusChip}
        <div style={{ flex: 1 }} />
        <Button
          onClick={() => onSave(bucket.trim(), prefix)}
          disabled={!bucket || !dirty}
        >
          {saveLabel}
        </Button>
      </div>

      {saved && (
        <div style={{ marginTop: 16 }}>
          <KeyValueList
            items={[
              {
                k: 'saved bucket',
                v: <MonoValue size='sm'>{saved.bucket}</MonoValue>,
              },
              {
                k: 'saved prefix',
                v: (
                  <MonoValue size='sm'>
                    {saved.prefix || '(bucket root)'}
                  </MonoValue>
                ),
              },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <Button tone='ghost' onClick={onForget}>
              {forgetLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function SettingsPage(): ReactElement {
  const [draft, setDraft] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });

  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [savedBlob, setSavedBlob] = useState<SavedBlob | null>(null);
  const [savedSftBlob, setSavedSftBlob] = useState<SavedBlob | null>(null);

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
    }
    const sftBlob = getBlobSftRoot();
    if (sftBlob) {
      setSavedSftBlob({ bucket: sftBlob.bucket, prefix: sftBlob.prefix });
    }
    listBuckets()
      .then(setBuckets)
      .catch(() => {
        // Buckets dropdown stays empty — surfaced via empty-state below.
      });
  }, [probeUrl]);

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

  const handleBlobSave = useCallback((bucket: string, prefix: string): void => {
    if (!bucket) {
      return;
    }
    setBlobRoot({ bucket, prefix });
    const stored = getBlobRoot();
    if (stored) {
      setSavedBlob({ bucket: stored.bucket, prefix: stored.prefix });
    }
  }, []);

  const handleBlobForget = useCallback((): void => {
    clearBlobRoot();
    setSavedBlob(null);
  }, []);

  const handleSftSave = useCallback((bucket: string, prefix: string): void => {
    if (!bucket) {
      return;
    }
    setBlobSftRoot({ bucket, prefix });
    const stored = getBlobSftRoot();
    if (stored) {
      setSavedSftBlob({ bucket: stored.bucket, prefix: stored.prefix });
    }
  }, []);

  const handleSftForget = useCallback((): void => {
    clearBlobSftRoot();
    setSavedSftBlob(null);
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
        <BlobPathPicker
          buckets={buckets}
          saved={savedBlob}
          onSave={handleBlobSave}
          onForget={handleBlobForget}
          saveLabel='Save'
          forgetLabel='Forget blob source'
          emptyHint='no sub-directories here — saving this prefix will scan its contents as cases'
        />
      </SettingsSection>
      <SettingsSection
        title='Blob SFT source'
        description='Point the SFT preview at a blob prefix containing extractor.jsonl / auditor.jsonl / dropped.jsonl. Pick a bucket and drill into the directory tree.'
      >
        <BlobPathPicker
          buckets={buckets}
          saved={savedSftBlob}
          onSave={handleSftSave}
          onForget={handleSftForget}
          saveLabel='Save'
          forgetLabel='Forget SFT source'
          emptyHint='no sub-directories here — saving this prefix will read extractor.jsonl / auditor.jsonl / dropped.jsonl from it'
        />
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
