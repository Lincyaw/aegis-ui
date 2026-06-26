import { BookOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import NoteResolve from './pages/NoteResolve';
import NotesHome from './pages/NotesHome';
import NotesLayout from './pages/NotesLayout';
import NoteView from './pages/NoteView';

export const notesApp: AegisApp = {
  id: 'notes',
  label: 'Notes',
  icon: <BookOutlined />,
  basePath: '/notes',
  description: 'Personal knowledge base reader with wikilink navigation.',
  routes: [
    {
      path: '',
      element: <NotesLayout />,
      children: [
        { index: true, element: <NotesHome /> },
        { path: 'note/*', element: <NoteView /> },
        { path: 'resolve/:slug', element: <NoteResolve /> },
      ],
    },
  ],
};
