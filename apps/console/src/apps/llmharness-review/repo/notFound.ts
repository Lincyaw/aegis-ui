import { ApiError } from '../../../api/apiClient';

/** A missing file or directory, from the FS Access API or an HTTP 404. The
 *  only failure a repo treats as "absent"; every other error propagates. */
export function isNotFound(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'NotFoundError') ||
    (err instanceof ApiError && err.status === 404)
  );
}
