import { useOutletContext } from 'react-router-dom';

import type { NoteFile } from './slug-index';

export interface NotesOutletContext {
  files: NoteFile[];
  slugIndex: Map<string, string>;
  loading: boolean;
}

export function useNotesContext(): NotesOutletContext {
  return useOutletContext<NotesOutletContext>();
}
