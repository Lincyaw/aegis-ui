import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import {
  loadConnection,
  type ReviewConnection,
  saveConnection,
} from './connection';
import { repoFor } from './repo';
import { ReviewContext } from './review';

export function ReviewProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [connection, setState] = useState(loadConnection);
  const value = useMemo(
    () => ({
      connection,
      setConnection: (next: ReviewConnection) => {
        saveConnection(next);
        setState(next);
      },
      repo: repoFor(connection),
    }),
    [connection]
  );
  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

export function ReviewRoot(): ReactElement {
  return (
    <ReviewProvider>
      <Outlet />
    </ReviewProvider>
  );
}
