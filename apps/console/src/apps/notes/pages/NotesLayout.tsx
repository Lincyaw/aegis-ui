import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  EmptyState,
  ErrorState,
  SearchInput,
  SkeletonText,
} from '@lincyaw/aegis-ui';
import { Drawer } from 'antd';

import { NOTES_REPO, useRefreshNotes, useRepoTree } from '../api/github-client';
import { NoteTree } from '../components/NoteTree';
import type { NotesOutletContext } from '../lib/notes-context';
import { buildNoteFiles, buildSlugIndex } from '../lib/slug-index';
import { useMediaQuery } from '../lib/use-media-query';
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
    [tree.data]
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
    [files, slugIndex, tree.isLoading]
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
      <div className='notes-app__sidebar-head'>
        <div className='notes-app__repo'>
          {NOTES_REPO}
          <Button
            tone='ghost'
            title='Refresh notes'
            aria-label='Refresh notes'
            onClick={refresh}
          >
            <ReloadOutlined spin={tree.isFetching} />
          </Button>
        </div>
        <SearchInput
          placeholder='Search notes'
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
        />
      </div>
      <div className='notes-app__tree'>
        {tree.isLoading ? (
          <SkeletonText lines={6} />
        ) : tree.isError ? (
          <ErrorState
            size='compact'
            title='Failed to load notes'
            description='The repository tree could not be fetched.'
            action={
              <Button tone='secondary' onClick={refresh}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState title={query ? 'No matching notes' : 'No notes'} />
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
    <div className='notes-app'>
      {isMobile ? (
        <>
          <div className='notes-app__mobile-bar'>
            <Button
              tone='secondary'
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuOutlined />
              Browse notes
            </Button>
          </div>
          <Drawer
            open={drawerOpen}
            placement='left'
            onClose={() => setDrawerOpen(false)}
            width='var(--notes-drawer-width)'
            rootClassName='notes-app__drawer'
            classNames={{ body: 'notes-app__drawer-body' }}
            title={NOTES_REPO}
          >
            {sidebarContent}
          </Drawer>
        </>
      ) : (
        <aside className='notes-app__sidebar'>{sidebarContent}</aside>
      )}
      <main className='notes-app__content'>
        <Outlet context={context} />
      </main>
    </div>
  );
}
