import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { FileTree, type FileTreeFile } from '@lincyaw/aegis-ui';

import { noteUrl } from '../lib/routes';
import type { NoteFile } from '../lib/slug-index';

interface NoteTreeProps {
  files: NoteFile[];
  currentPath: string;
  /** Called after a note is selected (used to close the mobile drawer). */
  onSelect?: () => void;
}

export function NoteTree({
  files,
  currentPath,
  onSelect,
}: NoteTreeProps): JSX.Element {
  const navigate = useNavigate();
  const treeFiles = useMemo<FileTreeFile[]>(
    () => files.map((file) => ({ path: file.path, label: file.slug })),
    [files]
  );

  return (
    <FileTree
      files={treeFiles}
      ariaLabel='Notes'
      selectedPath={currentPath || undefined}
      onSelect={(path) => {
        navigate(noteUrl(path));
        onSelect?.();
      }}
    />
  );
}
