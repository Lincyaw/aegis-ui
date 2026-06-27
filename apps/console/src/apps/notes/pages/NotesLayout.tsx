import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Empty, Input, Spin, Tooltip } from 'antd';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { NOTES_REPO, useRefreshNotes, useRepoTree } from '../api/github-client';
import { NoteTree } from '../components/NoteTree';
import type { NotesOutletContext } from '../lib/notes-context';
import { useMediaQuery } from '../lib/use-media-query';
import { buildNoteFiles, buildSlugIndex } from '../lib/slug-index';

import '../notes-app.css';

export default function NotesLayout(): JSX.Element {
  const tree = useRepoTree();
  const params = useParams();
  const currentPath = params['*'] ?? '';
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const files = useMemo(
    () => buildNoteFiles((tree.data ?? []).map((entry) => entry.path)),
    [tree.data],
  );
  const slugIndex = useMemo(() => buildSlugIndex(files), [files]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return files;
    }
    return files.filter((file) => file.path.toLowerCase().includes(q));
  }, [files, query]);

  const context: NotesOutletContext = useMemo(
    () => ({ files, slugIndex, loading: tree.isLoading }),
    [files, slugIndex, tree.isLoading],
  );

  const refresh = useRefreshNotes();

  // Close drawer when a note is navigated to on mobile.
  useEffect(() => {
    if (isMobile && drawerOpen) {
      setDrawerOpen(false);
    }
    // We only want this to fire when the path changes, not when drawerOpen
    // changes — that would fight the user toggling it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  const handleNoteTreeSelect = useCallback(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const sidebarContent = (
    <>
      <div className="notes-app__sidebar-head">
        <div className="notes-app__repo">
          {NOTES_REPO}
          <Tooltip title="Refresh">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined spin={tree.isFetching} />}
              onClick={refresh}
            />
          </Tooltip>
        </div>
        <Input
          allowClear
          size="small"
          placeholder="Search notes"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setQuery(event.target.value)
          }
        />
      </div>
      <div className="notes-app__tree">
        {tree.isLoading ? (
          <div className="notes-app__center">
            <Spin />
          </div>
        ) : tree.isError ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load notes"
            description="The repository tree could not be fetched."
          />
        ) : filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes" />
        ) : (
          <NoteTree
            files={filtered}
            currentPath={currentPath}
            onSelect={handleNoteTreeSelect}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="notes-app">
      {isMobile ? (
        <>
          <Button
            className="notes-app__menu-btn"
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
          />
          <Drawer
            open={drawerOpen}
            placement="left"
            onClose={() => setDrawerOpen(false)}
            width={280}
            styles={{ body: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' } }}
            title={NOTES_REPO}
          >
            {sidebarContent}
          </Drawer>
        </>
      ) : (
        <aside className="notes-app__sidebar">
          {sidebarContent}
        </aside>
      )}
      <main className="notes-app__content">
        <Outlet context={context} />
      </main>
    </div>
  );
}
