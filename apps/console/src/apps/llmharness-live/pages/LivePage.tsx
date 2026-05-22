/**
 * Main page for the Live Inspect sub-app. Layout:
 *
 *   ┌─────────────── StatusBanner ────────────────┐
 *   │ session tree (sidebar) │  tabs (content)    │
 *   └─────────────────────────────────────────────┘
 *
 * On first mount we attempt to auto-connect using the resolved URL
 * (?ws=… > localStorage). If neither is present we render the empty
 * state pointing the user to the Connection page.
 */

import { type ReactElement, useEffect } from 'react';

import { Link } from 'react-router-dom';

import { EmptyState } from '@lincyaw/aegis-ui';

import { SessionTabs } from '../components/SessionTabs';
import { SessionTree } from '../components/SessionTree';
import { StatusBanner } from '../components/StatusBanner';
import { resolveInitialWsUrl } from '../connection';
import { useInspectStore } from '../store/useInspectStream';
import { useTabsStore } from '../store/useTabs';

import './LivePage.css';

export function LivePage(): ReactElement {
  const status = useInspectStore((s) => s.status);
  const url = useInspectStore((s) => s.url);
  const rootSessionId = useInspectStore((s) => s.inspect.rootSessionId);
  const connect = useInspectStore((s) => s.connect);
  const openTab = useTabsStore((s) => s.openTab);
  const tabsActive = useTabsStore((s) =>
    rootSessionId ? (s.byRoot[rootSessionId]?.active ?? null) : null,
  );

  // Auto-connect on first mount when no connection is active.
  useEffect(() => {
    if (url || status === 'connecting' || status === 'live') {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const resolved = resolveInitialWsUrl(window.location.search);
    if (resolved) {
      connect(resolved);
    }
  }, [url, status, connect]);

  if (!url && status === 'disconnected') {
    return (
      <div className='lh-live'>
        <StatusBanner />
        <div className='lh-live__empty'>
          <EmptyState
            title='Not connected'
            description='Paste the WebSocket URL the AgentM live_inspector printed at startup (ws://host:port/inspect?root=…). The URL can also be passed via ?ws=… on the page URL.'
            action={
              <Link to='settings' className='lh-live__empty-link'>
                Open the Connection page →
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className='lh-live'>
      <StatusBanner />
      <div className='lh-live__body'>
        <aside className='lh-live__sidebar'>
          <SessionTree
            activeSessionId={tabsActive}
            onSelect={(sid) => {
              if (rootSessionId) {
                openTab(rootSessionId, sid);
              }
            }}
          />
        </aside>
        <main className='lh-live__main'>
          <SessionTabs />
        </main>
      </div>
    </div>
  );
}

export default LivePage;
