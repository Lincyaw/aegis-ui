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

import {
  clearBackendUrl,
  fetchHealth,
  getBackendUrl,
  type HealthInfo,
  setBackendUrl,
} from '../connection';

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'ok'; info: HealthInfo }
  | { kind: 'error'; message: string };

const PLACEHOLDER = 'http://host:8765';

export function SettingsPage(): ReactElement {
  const [draft, setDraft] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });

  useEffect(() => {
    const current = getBackendUrl();
    setSaved(current);
    setDraft(current ?? '');
    if (current) {
      void probeUrl(current);
    }
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
          <Button tone='ghost' onClick={() => void handleTest()} disabled={!draft.trim()}>
            Test
          </Button>
          <Button onClick={() => void handleSave()} disabled={!draft.trim() || !dirty}>
            Save
          </Button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
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
                { k: 'root', v: <MonoValue size='sm'>{probe.info.root}</MonoValue> },
                {
                  k: 'cases',
                  v: <MonoValue size='sm'>{String(probe.info.caseCount)}</MonoValue>,
                },
                { k: 'version', v: <MonoValue size='sm'>{probe.info.version}</MonoValue> },
              ]}
            />
          </div>
        )}
      </SettingsSection>
      {saved && (
        <SettingsSection
          title='Reset'
          description='Forget the saved URL. The Cases tab will fall back to picking a local directory.'
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
