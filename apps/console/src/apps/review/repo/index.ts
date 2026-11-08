import {
  type Item,
  type LinkSeries,
  type NodeDetail,
  REVIEW_API_PREFIX,
  type ServerInfo,
  staticFileFor,
  type Task,
  type TaskSummary,
  type Topology,
  type Verdict,
  type VerdictInput,
} from '@lincyaw/review-api';

import type { ReviewConnection } from '../connection';

import { ReviewHttpError, type ReviewRepo } from './types';

export type { ReviewRepo } from './types';
export { ReviewHttpError } from './types';

const seg = encodeURIComponent;

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${String(response.status)}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = `${message}: ${body.message}`;
      }
    } catch {
      // Not JSON; the status says enough.
    }
    throw new ReviewHttpError(response.status, message);
  }
  return (await response.json()) as T;
}

/**
 * Reads every resource with one GET each; `fetchPath` turns an API path
 * (`tasks/t1/items`) into a URL.
 */
function readers(
  fetchPath: (path: string) => Promise<Response>
): Omit<ReviewRepo, 'kind' | 'base' | 'getServer' | 'putVerdict'> {
  const get = async <T>(path: string): Promise<T> =>
    readJson<T>(await fetchPath(path));
  return {
    listTasks: () => get<TaskSummary[]>('tasks'),
    getTask: (taskId) => get<Task>(`tasks/${seg(taskId)}`),
    listItems: (taskId) => get<Item[]>(`tasks/${seg(taskId)}/items`),
    listVerdicts: async (taskId, reviewer) => {
      try {
        return await get<Verdict[]>(
          `tasks/${seg(taskId)}/verdicts/${seg(reviewer)}`
        );
      } catch (error) {
        // No verdicts saved yet.
        if (error instanceof ReviewHttpError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    getTopology: (contextId) =>
      get<Topology>(`contexts/${seg(contextId)}/topology`),
    getNode: (contextId, nodeId) =>
      get<NodeDetail>(`contexts/${seg(contextId)}/nodes/${seg(nodeId)}`),
    getLinkSeries: (contextId, linkId) =>
      get<LinkSeries>(`contexts/${seg(contextId)}/links/${seg(linkId)}/series`),
  };
}

/** A review server: `${base}/api/review/...`, verdicts saved with PUT. */
export function httpRepo(base: string): ReviewRepo {
  const url = (path: string): string => `${base}${REVIEW_API_PREFIX}/${path}`;
  return {
    kind: 'server',
    base,
    ...readers((path) => fetch(url(path))),
    getServer: async () => readJson<ServerInfo>(await fetch(url('server'))),
    putVerdict: async (taskId, reviewer, itemId, input: VerdictInput) =>
      readJson<Verdict>(
        await fetch(
          url(`tasks/${seg(taskId)}/verdicts/${seg(reviewer)}/${seg(itemId)}`),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        )
      ),
  };
}

/**
 * A folder of JSON files served as is: `GET <path>` reads
 * `${base}/<path>.json`. Nothing can be saved.
 */
export function staticRepo(base: string): ReviewRepo {
  const fetchPath = (path: string): Promise<Response> =>
    fetch(`${base}/${staticFileFor(path)}`);
  return {
    kind: 'static',
    base,
    ...readers(fetchPath),
    getServer: async () => {
      try {
        const info = await readJson<ServerInfo>(await fetchPath('server'));
        return { ...info, writable: false };
      } catch {
        return { name: 'static folder', version: '', writable: false };
      }
    },
    putVerdict: () =>
      Promise.reject(new Error('A static folder is read-only.')),
  };
}

export function repoFor(connection: ReviewConnection): ReviewRepo {
  return connection.mode === 'static'
    ? staticRepo(connection.url)
    : httpRepo(connection.url);
}
