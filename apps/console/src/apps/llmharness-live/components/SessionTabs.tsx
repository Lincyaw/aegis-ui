/**
 * Tab container that hosts one view per open session. Tab choice is
 * persisted per root_session_id in ``useTabsStore``.
 */

import { type ReactElement, useEffect, useMemo } from 'react';

import { Tabs } from 'antd';

import { EmptyState } from '@lincyaw/aegis-ui';

import {
  PURPOSE_AUDITOR,
  PURPOSE_EXTRACTOR,
  type SessionNode,
} from '../protocol';
import { useInspectStore } from '../store/useInspectStream';
import { useTabsStore } from '../store/useTabs';
import { AuditorView } from '../views/AuditorView';
import { ExtractorView } from '../views/ExtractorView';
import { MainAgentView } from '../views/MainAgentView';

function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function tabLabel(node: SessionNode): string {
  if (node.purpose === PURPOSE_EXTRACTOR) {
    return `extractor · ${shortId(node.id)}`;
  }
  if (node.purpose === PURPOSE_AUDITOR) {
    return `auditor · ${shortId(node.id)}`;
  }
  if (!node.purpose || node.purpose === 'root') {
    return `main · ${shortId(node.id)}`;
  }
  return `${node.purpose} · ${shortId(node.id)}`;
}

function renderView(node: SessionNode): ReactElement {
  if (node.purpose === PURPOSE_EXTRACTOR) {
    return <ExtractorView sessionId={node.id} />;
  }
  if (node.purpose === PURPOSE_AUDITOR) {
    return <AuditorView sessionId={node.id} />;
  }
  return <MainAgentView sessionId={node.id} />;
}

export function SessionTabs(): ReactElement {
  const sessions = useInspectStore((s) => s.inspect.sessions);
  const rootSessionId = useInspectStore((s) => s.inspect.rootSessionId);
  const byRoot = useTabsStore((s) => s.byRoot);
  const openTab = useTabsStore((s) => s.openTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const setActive = useTabsStore((s) => s.setActive);

  // Auto-open root tab the first time it becomes known.
  useEffect(() => {
    if (!rootSessionId || !sessions.has(rootSessionId)) {
      return;
    }
    const current = byRoot[rootSessionId];
    if (!current || current.openTabs.length === 0) {
      openTab(rootSessionId, rootSessionId);
    }
  }, [rootSessionId, sessions, byRoot, openTab]);

  const entry = rootSessionId ? byRoot[rootSessionId] : undefined;
  const tabs = useMemo(() => {
    if (!entry) {
      return [];
    }
    return entry.openTabs
      .map((sid) => sessions.get(sid))
      .filter((n): n is SessionNode => Boolean(n))
      .map((node) => ({
        key: node.id,
        label: <span title={`${node.id}\n${node.cwd}`}>{tabLabel(node)}</span>,
        children: (
          <div className='lh-tabs__panel'>{renderView(node)}</div>
        ),
        closable: node.id !== rootSessionId,
      }));
  }, [entry, sessions, rootSessionId]);

  if (!rootSessionId) {
    return (
      <EmptyState
        title='No session selected'
        description='Open a session from the sidebar to inspect it.'
      />
    );
  }
  if (tabs.length === 0) {
    return (
      <EmptyState
        title='No open tabs'
        description='Click a session in the sidebar tree to open it as a tab.'
      />
    );
  }

  const activeKey = entry?.active ?? tabs[0].key;

  return (
    <Tabs
      type='editable-card'
      hideAdd
      activeKey={activeKey}
      onChange={(k) => {
        if (rootSessionId) {
          setActive(rootSessionId, k);
        }
      }}
      onEdit={(targetKey, action) => {
        if (action === 'remove' && typeof targetKey === 'string' && rootSessionId) {
          closeTab(rootSessionId, targetKey);
        }
      }}
      items={tabs}
      style={{ height: '100%' }}
      tabBarStyle={{ marginBottom: 0 }}
    />
  );
}
