import {
  type ComponentType,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { CaretDownOutlined, FolderOutlined } from '@ant-design/icons';
import {
  Breadcrumb,
  type BreadcrumbItem,
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
  type BlobRoot,
  type BlobRootStore,
  casesBlobRoot,
  clearBackendUrl,
  fetchHealth,
  getBackendUrl,
  type HealthInfo,
  setBackendUrl,
  sftBlobRoot,
} from '../connection';

import './SettingsPage.css';

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

type CrumbLink = ComponentType<{
  to: string;
  className?: string;
  children: ReactNode;
}>;

interface BlobPathPickerProps {
  buckets: BucketSummary[];
  store: BlobRootStore;
  saveLabel: string;
  forgetLabel: string;
  emptyHint: string;
}

function BlobPathPicker({
  buckets,
  store,
  saveLabel,
  forgetLabel,
  emptyHint,
}: BlobPathPickerProps): ReactElement {
  const [saved, setSaved] = useState<BlobRoot | null>(store.get);
  const [bucket, setBucket] = useState<string>(saved?.bucket ?? '');
  const [prefix, setPrefix] = useState<string>(saved?.prefix ?? '');
  const [browse, setBrowse] = useState<BrowseState>({ kind: 'idle' });

  // Re-hydrate when the saved value changes (e.g. on forget).
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
        const subdirs = (page.common_prefixes ?? []).filter(
          (p) => p !== prefix
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

  // Crumb `to` is the absolute path inside the bucket ('/' = bucket root)
  // so the root crumb has a non-empty target and renders as a link.
  const crumbs: BreadcrumbItem[] = [
    { label: bucket, to: '/' },
    ...prefix
      .split('/')
      .filter((s) => s.length > 0)
      .map((seg, idx, arr) => ({
        label: seg,
        to: `/${arr.slice(0, idx + 1).join('/')}/`,
      })),
  ];

  const PrefixLink = useMemo<CrumbLink>(
    () =>
      function PrefixLink({ to, className, children }) {
        return (
          <button
            type='button'
            className={`${className ?? ''} llmh-settings__crumb`}
            onClick={() => setPrefix(to.slice(1))}
          >
            {children}
          </button>
        );
      },
    []
  );

  return (
    <>
      <div className='llmh-settings__row'>
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
        <div className='llmh-settings__block'>
          <div className='llmh-settings__path'>
            <MetricLabel size='xs'>path</MetricLabel>
            <Breadcrumb items={crumbs} linkComponent={PrefixLink} />
          </div>
          <div className='llmh-settings__subdirs'>
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
                const rel = sub.startsWith(prefix)
                  ? sub.slice(prefix.length)
                  : sub;
                const label = rel.replace(/\/$/, '');
                return (
                  <Chip key={sub} tone='default' onClick={() => setPrefix(sub)}>
                    <FolderOutlined className='llmh-settings__folder-icon' />
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

      <div className='llmh-settings__block llmh-settings__actions'>
        {statusChip}
        <div className='llmh-settings__spacer' />
        <Button
          onClick={() => {
            store.set({ bucket, prefix });
            setSaved(store.get());
          }}
          disabled={!bucket || !dirty}
        >
          {saveLabel}
        </Button>
      </div>

      {saved && (
        <div className='llmh-settings__block'>
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
          <div className='llmh-settings__forget'>
            <Button
              tone='ghost'
              onClick={() => {
                store.clear();
                setSaved(null);
              }}
            >
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
        <div className='llmh-settings__url-row'>
          <div className='llmh-settings__spacer'>
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
        <div className='llmh-settings__row llmh-settings__status'>
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
          <div className='llmh-settings__block'>
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
          store={casesBlobRoot}
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
          store={sftBlobRoot}
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
