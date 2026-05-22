/**
 * Connection settings page. Renders an input for the WebSocket URL plus
 * connect / disconnect buttons. Validates the URL shape before allowing
 * connect — the inspector requires ``?root=<id>``.
 */

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
  clearStoredWsUrl,
  getStoredWsUrl,
  resolveInitialWsUrl,
  setStoredWsUrl,
  validateWsUrl,
} from '../connection';
import { useInspectStore } from '../store/useInspectStream';

const PLACEHOLDER = 'ws://127.0.0.1:8765/inspect?root=<root_session_id>';

export function ConnectionPage(): ReactElement {
  const [draft, setDraft] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);

  const status = useInspectStore((s) => s.status);
  const url = useInspectStore((s) => s.url);
  const errorMessage = useInspectStore((s) => s.errorMessage);
  const rootSessionId = useInspectStore((s) => s.inspect.rootSessionId);
  const sessionCount = useInspectStore((s) => s.inspect.sessions.size);
  const connect = useInspectStore((s) => s.connect);
  const disconnect = useInspectStore((s) => s.disconnect);

  useEffect(() => {
    const current = getStoredWsUrl();
    setSaved(current);
    if (typeof window !== 'undefined') {
      const resolved = resolveInitialWsUrl(window.location.search);
      setDraft(resolved ?? current ?? '');
    } else if (current) {
      setDraft(current);
    }
  }, []);

  const validation = validateWsUrl(draft);
  const dirty = draft.trim() !== (saved ?? '');

  const handleConnect = useCallback((): void => {
    if (!validation.ok) {
      return;
    }
    const trimmed = draft.trim();
    setStoredWsUrl(trimmed);
    setSaved(trimmed);
    connect(trimmed);
  }, [draft, validation.ok, connect]);

  const handleDisconnect = useCallback((): void => {
    disconnect();
  }, [disconnect]);

  const handleForget = useCallback((): void => {
    clearStoredWsUrl();
    setSaved(null);
    setDraft('');
    disconnect();
  }, [disconnect]);

  const statusChip = (() => {
    switch (status) {
      case 'live':
        return <Chip tone='ink'>live</Chip>;
      case 'replaying_backlog':
        return <Chip tone='default'>replaying backlog</Chip>;
      case 'connecting':
        return <Chip tone='default'>connecting…</Chip>;
      case 'closed':
      case 'error':
        return <Chip tone='warning'>{status}</Chip>;
      default:
        return <Chip tone='default'>not connected</Chip>;
    }
  })();

  return (
    <Panel
      title={<PanelTitle size='lg'>Connection</PanelTitle>}
      extra={<MetricLabel>live_inspector · WebSocket</MetricLabel>}
    >
      <SettingsSection
        title='WebSocket URL'
        description='Paste the URL the AgentM live_inspector atom prints to stderr at startup (e.g. ws://127.0.0.1:8765/inspect?root=<id>).'
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextField
              label='URL'
              placeholder={PLACEHOLDER}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
              }}
              spellCheck={false}
              autoComplete='off'
            />
          </div>
          {url ? (
            <Button tone='ghost' onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : null}
          <Button onClick={handleConnect} disabled={!validation.ok}>
            {url && !dirty ? 'Reconnect' : 'Connect'}
          </Button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          {statusChip}
          {!validation.ok && draft.trim() && (
            <MetricLabel size='xs'>{validation.reason}</MetricLabel>
          )}
          {status === 'error' && errorMessage && (
            <MetricLabel size='xs'>{errorMessage}</MetricLabel>
          )}
        </div>
        {(status === 'live' || status === 'replaying_backlog') && (
          <div style={{ marginTop: 16 }}>
            <KeyValueList
              items={[
                {
                  k: 'root_session_id',
                  v: <MonoValue size='sm'>{rootSessionId ?? '—'}</MonoValue>,
                },
                {
                  k: 'sessions seen',
                  v: <MonoValue size='sm'>{sessionCount.toString()}</MonoValue>,
                },
                {
                  k: 'connected URL',
                  v: <MonoValue size='sm'>{url ?? '—'}</MonoValue>,
                },
              ]}
            />
          </div>
        )}
      </SettingsSection>
      {saved && (
        <SettingsSection
          title='Reset'
          description='Forget the saved URL. You will need to paste it again to reconnect.'
        >
          <Button tone='ghost' onClick={handleForget}>
            Forget URL
          </Button>
        </SettingsSection>
      )}
    </Panel>
  );
}

export default ConnectionPage;
