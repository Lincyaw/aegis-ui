import { Alert, Spin } from 'antd';
import { Navigate, useParams } from 'react-router-dom';

import { useNotesContext } from '../lib/notes-context';
import { noteUrl } from '../lib/routes';
import { resolveSlugToPath } from '../lib/slug-index';

export default function NoteResolve(): JSX.Element {
  const { slug } = useParams();
  const { slugIndex, loading } = useNotesContext();

  if (loading) {
    return (
      <div className="notes-app__center">
        <Spin />
      </div>
    );
  }

  const path = slug ? resolveSlugToPath(slugIndex, slug) : null;
  if (path) {
    return <Navigate to={noteUrl(path)} replace />;
  }

  return (
    <Alert
      type="warning"
      showIcon
      message="Note not found"
      description={`No note matches the slug "${slug ?? ''}".`}
    />
  );
}
