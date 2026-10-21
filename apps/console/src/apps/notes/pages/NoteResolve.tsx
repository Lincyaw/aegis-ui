import { Navigate, useParams } from 'react-router-dom';

import { ErrorState, SkeletonText } from '@lincyaw/aegis-ui';

import { useNotesContext } from '../lib/notes-context';
import { noteUrl } from '../lib/routes';
import { resolveSlugToPath } from '../lib/slug-index';

export default function NoteResolve(): JSX.Element {
  const { slug } = useParams();
  const { slugIndex, loading } = useNotesContext();

  if (loading) {
    return <SkeletonText lines={8} />;
  }

  const path = slug ? resolveSlugToPath(slugIndex, slug) : null;
  if (path) {
    return <Navigate to={noteUrl(path)} replace />;
  }

  return (
    <ErrorState
      title='Note not found'
      description={`No note matches the slug "${slug ?? ''}".`}
    />
  );
}
