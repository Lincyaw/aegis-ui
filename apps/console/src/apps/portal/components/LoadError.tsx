import { EmptyState, ErrorState } from '@lincyaw/aegis-ui';

import { errMsg } from '../../../api/apiClient';
import { isNotFound } from '../api/list';

interface LoadErrorProps {
  error: unknown;
  /** E.g. `Failed to load dataset`. */
  title: string;
  /** Shown instead when the server answered 404. */
  notFound?: { title: string; description?: string };
}

/** A failed query: the server's message, or "not found" only when the server said so. */
export function LoadError({ error, title, notFound }: LoadErrorProps) {
  if (notFound !== undefined && isNotFound(error)) {
    return (
      <EmptyState title={notFound.title} description={notFound.description} />
    );
  }
  return (
    <ErrorState size='compact' title={title} description={errMsg(error)} />
  );
}
