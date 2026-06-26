import { Alert, Empty, Input, Spin } from 'antd';
import { type ChangeEvent, useMemo, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { NOTES_REPO, useRepoTree } from '../api/github-client';
import { NoteTree } from '../components/NoteTree';
import type { NotesOutletContext } from '../lib/notes-context';
import { buildNoteFiles, buildSlugIndex } from '../lib/slug-index';

import '../notes-app.css';

export default function NotesLayout(): JSX.Element {
  const tree = useRepoTree();
  const params = useParams();
  const currentPath = params['*'] ?? '';
  const [query, setQuery] = useState('');

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

  return (
    <div className="notes-app">
      <aside className="notes-app__sidebar">
        <div className="notes-app__sidebar-head">
          <div className="notes-app__repo">{NOTES_REPO}</div>
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
            <NoteTree files={filtered} currentPath={currentPath} />
          )}
        </div>
      </aside>
      <main className="notes-app__content">
        <Outlet context={context} />
      </main>
    </div>
  );
}
